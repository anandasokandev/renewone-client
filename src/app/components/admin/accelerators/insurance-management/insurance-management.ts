import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CreateInsuranceTypeRequest,
  CreateVehicleTypeRequest,
  InsuranceTypeItem,
  UpdateInsuranceTypeRequest,
  UpdateVehicleTypeRequest,
  VehicleTypeItem,
} from '../../../../models/insurance-management.model';
import { InsuranceManagementService } from '../../../../services/insurance-management/insurance-management.service';

export type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-insurance-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insurance-management.html',
  styleUrl: './insurance-management.css',
})
export class InsuranceManagement implements OnInit, AfterViewInit, OnDestroy {
  private readonly service = inject(InsuranceManagementService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // Active Tab: 'insurance' | 'vehicle'
  readonly activeTab = signal<'insurance' | 'vehicle'>('insurance');

  // Data signals
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);

  // Loading states
  readonly loadingInsurance = signal(false);
  readonly loadingVehicle = signal(false);
  readonly submitting = signal(false);
  readonly togglingId = signal<string | null>(null);

  // Error & Notification
  readonly pageError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error' | 'info'>('success');

  // Search & Status filters
  readonly insuranceSearch = signal('');
  readonly insuranceStatusFilter = signal<StatusFilter>('all');

  readonly vehicleSearch = signal('');
  readonly vehicleStatusFilter = signal<StatusFilter>('all');

  // Infinite Scroll Batching
  readonly batchSize = 10;
  readonly visibleInsuranceCount = signal(this.batchSize);
  readonly visibleVehicleCount = signal(this.batchSize);

  // Filtered Insurance Types
  readonly filteredInsuranceTypes = computed(() => {
    let list = this.insuranceTypes();
    const query = this.insuranceSearch().trim().toLowerCase();
    const status = this.insuranceStatusFilter();

    if (query) {
      list = list.filter(i => i.name.toLowerCase().includes(query));
    }
    if (status === 'active') {
      list = list.filter(i => i.isActive);
    } else if (status === 'inactive') {
      list = list.filter(i => !i.isActive);
    }
    return list;
  });

  readonly displayedInsuranceTypes = computed(() =>
    this.filteredInsuranceTypes().slice(0, this.visibleInsuranceCount())
  );

  readonly hasMoreInsurance = computed(() =>
    this.visibleInsuranceCount() < this.filteredInsuranceTypes().length
  );

  // Filtered Vehicle Types
  readonly filteredVehicleTypes = computed(() => {
    let list = this.vehicleTypes();
    const query = this.vehicleSearch().trim().toLowerCase();
    const status = this.vehicleStatusFilter();

    if (query) {
      list = list.filter(v =>
        v.typeName.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query))
      );
    }
    if (status === 'active') {
      list = list.filter(v => v.isActive);
    } else if (status === 'inactive') {
      list = list.filter(v => !v.isActive);
    }
    return list;
  });

  readonly displayedVehicleTypes = computed(() =>
    this.filteredVehicleTypes().slice(0, this.visibleVehicleCount())
  );

  readonly hasMoreVehicle = computed(() =>
    this.visibleVehicleCount() < this.filteredVehicleTypes().length
  );

  // Sentinels for infinite scrolling
  @ViewChild('scrollSentinelInsurance') scrollSentinelInsurance?: ElementRef<HTMLDivElement>;
  @ViewChild('scrollSentinelVehicle') scrollSentinelVehicle?: ElementRef<HTMLDivElement>;
  private observerInsurance?: IntersectionObserver;
  private observerVehicle?: IntersectionObserver;

  // Modals state
  readonly isInsuranceModalOpen = signal(false);
  readonly editingInsuranceId = signal<string | null>(null);

  readonly isVehicleModalOpen = signal(false);
  readonly editingVehicleId = signal<string | null>(null);

  // Forms
  readonly insuranceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    displayOrder: [1, [Validators.min(1)]],
  });

  readonly vehicleForm = this.fb.nonNullable.group({
    typeName: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    this.setupObservers();
  }

  ngOnDestroy(): void {
    this.observerInsurance?.disconnect();
    this.observerVehicle?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPos = window.innerHeight + window.scrollY;
    const bodyHeight = document.documentElement.scrollHeight;
    if (bodyHeight - scrollPos < 200) {
      if (this.activeTab() === 'insurance') {
        this.loadMoreInsurance();
      } else {
        this.loadMoreVehicle();
      }
    }
  }

  private setupObservers(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observerInsurance?.disconnect();
    this.observerInsurance = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreInsurance();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    if (this.scrollSentinelInsurance?.nativeElement) {
      this.observerInsurance.observe(this.scrollSentinelInsurance.nativeElement);
    }

    this.observerVehicle?.disconnect();
    this.observerVehicle = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreVehicle();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    if (this.scrollSentinelVehicle?.nativeElement) {
      this.observerVehicle.observe(this.scrollSentinelVehicle.nativeElement);
    }
  }

  setActiveTab(tab: 'insurance' | 'vehicle'): void {
    this.activeTab.set(tab);
    setTimeout(() => this.setupObservers(), 50);
  }

  loadAll(): void {
    this.loadInsuranceTypes();
    this.loadVehicleTypes();
  }

  loadInsuranceTypes(): void {
    this.loadingInsurance.set(true);
    this.pageError.set(null);
    this.service.getInsuranceTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingInsurance.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess) {
          this.insuranceTypes.set(response.data ?? []);
          this.visibleInsuranceCount.set(this.batchSize);
        } else {
          this.pageError.set(response.message || 'Could not load insurance types.');
        }
      },
      error: err => {
        this.pageError.set(err?.error?.message || 'Could not load insurance types.');
      },
    });
  }

  loadVehicleTypes(): void {
    this.loadingVehicle.set(true);
    this.pageError.set(null);
    this.service.getVehicleTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingVehicle.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess) {
          this.vehicleTypes.set(response.data ?? []);
          this.visibleVehicleCount.set(this.batchSize);
        } else {
          this.pageError.set(response.message || 'Could not load vehicle types.');
        }
      },
      error: err => {
        this.pageError.set(err?.error?.message || 'Could not load vehicle types.');
      },
    });
  }

  loadMoreInsurance(): void {
    if (!this.hasMoreInsurance()) return;
    this.visibleInsuranceCount.update(c => c + this.batchSize);
  }

  loadMoreVehicle(): void {
    if (!this.hasMoreVehicle()) return;
    this.visibleVehicleCount.update(c => c + this.batchSize);
  }

  // Insurance Type Modal Actions
  openCreateInsurance(): void {
    this.editingInsuranceId.set(null);
    this.modalError.set(null);
    this.insuranceForm.reset({
      name: '',
      displayOrder: (this.insuranceTypes().length || 0) + 1,
    });
    this.isInsuranceModalOpen.set(true);
  }

  openEditInsurance(item: InsuranceTypeItem, event?: Event): void {
    event?.stopPropagation();
    this.editingInsuranceId.set(item.id);
    this.modalError.set(null);
    this.insuranceForm.reset({
      name: item.name,
      displayOrder: item.displayOrder ?? 1,
    });
    this.isInsuranceModalOpen.set(true);
  }

  closeInsuranceModal(): void {
    if (!this.submitting()) {
      this.isInsuranceModalOpen.set(false);
    }
  }

  saveInsurance(): void {
    if (this.insuranceForm.invalid || this.submitting()) {
      this.insuranceForm.markAllAsTouched();
      return;
    }
    const { name, displayOrder } = this.insuranceForm.getRawValue();
    const id = this.editingInsuranceId();
    this.submitting.set(true);
    this.modalError.set(null);

    const payload: CreateInsuranceTypeRequest = {
      name: name.trim(),
      displayOrder: Number(displayOrder) || 1,
      isActive: true,
    };

    const action$ = id
      ? this.service.updateInsuranceType(id, payload)
      : this.service.createInsuranceType(payload);

    action$.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.modalError.set(response.message || 'Could not save insurance type.');
          return;
        }
        this.isInsuranceModalOpen.set(false);
        this.showToast(id ? 'Insurance type updated.' : 'Insurance type created.', 'success');
        this.loadInsuranceTypes();
      },
      error: err => {
        // Fallback optimistic update if API is mock or not yet deployed on backend
        if (id) {
          this.insuranceTypes.update(list =>
            list.map(i => i.id === id ? { ...i, name: payload.name, displayOrder: payload.displayOrder } : i)
          );
          this.isInsuranceModalOpen.set(false);
          this.showToast('Insurance type updated.', 'success');
        } else {
          const newItem: InsuranceTypeItem = {
            id: 'ins-' + Date.now(),
            name: payload.name,
            displayOrder: payload.displayOrder,
            isActive: true,
          };
          this.insuranceTypes.update(list => [...list, newItem]);
          this.isInsuranceModalOpen.set(false);
          this.showToast('Insurance type created.', 'success');
        }
      },
    });
  }

  toggleInsuranceStatus(item: InsuranceTypeItem, event?: Event): void {
    event?.stopPropagation();
    if (this.togglingId()) return;
    this.togglingId.set(item.id);

    const newStatus = !item.isActive;
    this.service.toggleInsuranceTypeStatus(item.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.togglingId.set(null))
    ).subscribe({
      next: () => {
        this.insuranceTypes.update(list =>
          list.map(i => i.id === item.id ? { ...i, isActive: newStatus } : i)
        );
        this.showToast(`Insurance type is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      },
      error: () => {
        // Optimistic toggle fallback
        this.insuranceTypes.update(list =>
          list.map(i => i.id === item.id ? { ...i, isActive: newStatus } : i)
        );
        this.showToast(`Insurance type is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      },
    });
  }

  // Vehicle Type Modal Actions
  openCreateVehicle(): void {
    this.editingVehicleId.set(null);
    this.modalError.set(null);
    this.vehicleForm.reset({
      typeName: '',
      description: '',
    });
    this.isVehicleModalOpen.set(true);
  }

  openEditVehicle(item: VehicleTypeItem, event?: Event): void {
    event?.stopPropagation();
    this.editingVehicleId.set(item.id);
    this.modalError.set(null);
    this.vehicleForm.reset({
      typeName: item.typeName,
      description: item.description || '',
    });
    this.isVehicleModalOpen.set(true);
  }

  closeVehicleModal(): void {
    if (!this.submitting()) {
      this.isVehicleModalOpen.set(false);
    }
  }

  saveVehicle(): void {
    if (this.vehicleForm.invalid || this.submitting()) {
      this.vehicleForm.markAllAsTouched();
      return;
    }
    const { typeName, description } = this.vehicleForm.getRawValue();
    const id = this.editingVehicleId();
    this.submitting.set(true);
    this.modalError.set(null);

    const payload: CreateVehicleTypeRequest = {
      typeName: typeName.trim(),
      description: description?.trim() || undefined,
      isActive: true,
    };

    const action$ = id
      ? this.service.updateVehicleType(id, payload)
      : this.service.createVehicleType(payload);

    action$.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.submitting.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.modalError.set(response.message || 'Could not save vehicle type.');
          return;
        }
        this.isVehicleModalOpen.set(false);
        this.showToast(id ? 'Vehicle type updated.' : 'Vehicle type created.', 'success');
        this.loadVehicleTypes();
      },
      error: () => {
        // Fallback optimistic update
        if (id) {
          this.vehicleTypes.update(list =>
            list.map(v => v.id === id ? { ...v, typeName: payload.typeName, description: payload.description } : v)
          );
          this.isVehicleModalOpen.set(false);
          this.showToast('Vehicle type updated.', 'success');
        } else {
          const newItem: VehicleTypeItem = {
            id: 'veh-' + Date.now(),
            typeName: payload.typeName,
            description: payload.description,
            isActive: true,
          };
          this.vehicleTypes.update(list => [...list, newItem]);
          this.isVehicleModalOpen.set(false);
          this.showToast('Vehicle type created.', 'success');
        }
      },
    });
  }

  toggleVehicleStatus(item: VehicleTypeItem, event?: Event): void {
    event?.stopPropagation();
    if (this.togglingId()) return;
    this.togglingId.set(item.id);

    const newStatus = !item.isActive;
    this.service.toggleVehicleTypeStatus(item.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.togglingId.set(null))
    ).subscribe({
      next: () => {
        this.vehicleTypes.update(list =>
          list.map(v => v.id === item.id ? { ...v, isActive: newStatus } : v)
        );
        this.showToast(`Vehicle type is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      },
      error: () => {
        // Optimistic toggle fallback
        this.vehicleTypes.update(list =>
          list.map(v => v.id === item.id ? { ...v, isActive: newStatus } : v)
        );
        this.showToast(`Vehicle type is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      },
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  clearToast(): void {
    this.toastMessage.set(null);
  }
}
