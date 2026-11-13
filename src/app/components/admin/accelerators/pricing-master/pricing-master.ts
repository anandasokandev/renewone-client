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
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject } from 'rxjs';
import {
  PricingAgentClassOption,
  PricingCompanyOption,
  PricingMasterFilters,
  PricingMasterItem,
  PricingMasterPage,
  PricingMasterRequest,
  PricingVehicleTypeOption,
} from '../../../../models/pricing-master.model';
import { PricingMasterService } from '../../../../services/pricing-master/pricing-master.service';

type ActiveFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-pricing-master',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pricing-master.html',
  styleUrl: './pricing-master.css',
})
export class PricingMaster implements OnInit, AfterViewInit, OnDestroy {
  readonly fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
  private readonly service = inject(PricingMasterService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly searchChanges = new Subject<string>();

  readonly items = signal<PricingMasterItem[]>([]);
  readonly companies = signal<PricingCompanyOption[]>([]);
  readonly agentClasses = signal<PricingAgentClassOption[]>([]);
  readonly vehicleTypes = signal<PricingVehicleTypeOption[]>([]);
  readonly search = signal('');
  readonly insuranceCompanyId = signal('');
  readonly agentClassId = signal('');
  readonly vehicleTypeId = signal('');
  readonly fuelType = signal('');
  readonly activeFilter = signal<ActiveFilter>('all');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly totalRecords = signal(0);
  readonly totalPages = signal(1);
  readonly isLoading = signal(false);
  readonly lookupLoading = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly noticeType = signal<'success' | 'error'>('success');
  readonly isModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly loadingEditId = signal<string | null>(null);
  readonly isMobileFilterExpanded = signal(false);

  // Infinite Scroll & Metrics
  readonly pageActiveCount = computed(() => this.items().filter(item => item.isActive).length);
  readonly pageInactiveCount = computed(() => this.items().filter(item => !item.isActive).length);
  readonly pageAdminProfit = computed(() => this.items().reduce((total, item) => total + item.adminProfit, 0));
  readonly hasMorePricing = computed(() => this.pageNumber() < this.totalPages());
  readonly firstRecord = computed(() => this.totalRecords() ? (this.pageNumber() - 1) * this.pageSize() + 1 : 0);
  readonly lastRecord = computed(() => Math.min(this.pageNumber() * this.pageSize(), this.totalRecords()));
  readonly pageOptions = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly extraFiltersCount = computed(() => {
    let count = 0;
    if (this.insuranceCompanyId()) count++;
    if (this.agentClassId()) count++;
    if (this.vehicleTypeId()) count++;
    if (this.fuelType()) count++;
    return count;
  });

  @ViewChild('scrollSentinel') set scrollSentinelRef(el: ElementRef<HTMLElement> | undefined) {
    if (el?.nativeElement && this.scrollObserver) {
      this.scrollObserver.observe(el.nativeElement);
    }
  }
  private scrollObserver?: IntersectionObserver;

  readonly form = this.fb.nonNullable.group({
    insuranceCompanyId: ['', Validators.required],
    agentClassId: ['', Validators.required],
    vehicleTypeId: ['', Validators.required],
    fuelType: [''],
    minCC: [0, [Validators.required, Validators.min(0)]],
    maxCC: [1, [Validators.required, Validators.min(1)]],
    totalPremium: [0, [Validators.required, Validators.min(0)]],
    companyPayable: [0, [Validators.required, Validators.min(0)]],
    agentPoints: [0, [Validators.required, Validators.min(0)]],
    adminProfit: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.searchChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(value => {
      this.search.set(value.trim());
      this.pageNumber.set(1);
      this.loadPricing();
    });
    this.loadLookups();
    this.loadPricing();
  }

  ngAfterViewInit(): void {
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < 250) {
      this.loadMorePricing();
    }
  }

  private setupScrollObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    this.scrollObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.loadMorePricing();
          }
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 },
    );
  }

  toggleMobileFilters(): void {
    this.isMobileFilterExpanded.update(v => !v);
  }

  loadLookups(): void {
    this.lookupLoading.set(true);
    this.lookupError.set(null);
    forkJoin({
      companies: this.service.getInsuranceCompanies(),
      classes: this.service.getAgentClasses(),
      vehicleTypes: this.service.getVehicleTypes(),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.lookupLoading.set(false)),
    ).subscribe({
      next: results => {
        const failed = Object.values(results).find(response => !response.isSuccess);
        if (failed) {
          this.lookupError.set(failed.message || 'Unable to load pricing options.');
          return;
        }
        this.companies.set(results.companies.data || []);
        this.agentClasses.set(results.classes.data || []);
        this.vehicleTypes.set(results.vehicleTypes.data || []);
      },
      error: error => this.lookupError.set(error?.error?.message || 'Unable to load insurance companies, agent classes, or vehicle types.'),
    });
  }

  loadPricing(isAppend: boolean = false): void {
    this.isLoading.set(true);
    this.pageError.set(null);
    this.service.getPricing(this.getFilters()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.pageError.set(response.message || 'Unable to load pricing records.');
          return;
        }
        this.applyPage(response.data, isAppend);
      },
      error: error => this.pageError.set(error?.error?.message || 'Unable to load pricing records.'),
    });
  }

  loadMorePricing(): void {
    if (!this.hasMorePricing() || this.isLoading()) return;
    this.pageNumber.update(p => p + 1);
    this.loadPricing(true);
  }

  refresh(): void {
    this.pageNumber.set(1);
    this.loadPricing(false);
  }

  onSearchChange(value: string): void { this.searchChanges.next(value); }

  setFilter(key: 'company' | 'class' | 'vehicle' | 'fuel' | 'active', value: string): void {
    if (key === 'company') this.insuranceCompanyId.set(value);
    if (key === 'class') this.agentClassId.set(value);
    if (key === 'vehicle') this.vehicleTypeId.set(value);
    if (key === 'fuel') this.fuelType.set(value);
    if (key === 'active') this.activeFilter.set(value as ActiveFilter);
    this.pageNumber.set(1);
    this.loadPricing(false);
  }

  clearFilters(): void {
    this.search.set('');
    this.insuranceCompanyId.set('');
    this.agentClassId.set('');
    this.vehicleTypeId.set('');
    this.fuelType.set('');
    this.activeFilter.set('all');
    this.pageNumber.set(1);
    this.loadPricing(false);
  }

  onToggleStatus(item: PricingMasterItem, event?: Event): void {
    if (event) event.stopPropagation();
    const newStatus = !item.isActive;
    this.items.update(items =>
      items.map(i => (i.id === item.id ? { ...i, isActive: newStatus } : i))
    );
    this.showNotice(
      `Pricing rule for "${item.insuranceCompanyName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
      'success'
    );
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadPricing();
  }

  changePageSize(value: string): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
    this.loadPricing();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.modalError.set(null);
    this.form.reset({
      insuranceCompanyId: '', agentClassId: '', vehicleTypeId: '', fuelType: '',
      minCC: 0, maxCC: 1, totalPremium: 0, companyPayable: 0, agentPoints: 0, adminProfit: 0,
    });
    this.isModalOpen.set(true);
  }

  openEdit(item: PricingMasterItem): void {
    if (this.loadingEditId()) return;
    this.loadingEditId.set(item.id);
    this.service.getPricingById(item.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingEditId.set(null)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.showNotice(response.message || 'Unable to load pricing details.', 'error');
          return;
        }
        const current = response.data;
        this.editingId.set(current.id);
        this.modalError.set(null);
        this.form.reset({
          insuranceCompanyId: current.insuranceCompanyId,
          agentClassId: current.agentClassId,
          vehicleTypeId: current.vehicleTypeId,
          fuelType: current.fuelType || '',
          minCC: current.minCC ?? 0,
          maxCC: current.maxCC ?? 1,
          totalPremium: current.totalPremium,
          companyPayable: current.companyPayable,
          agentPoints: current.agentPoints,
          adminProfit: current.adminProfit,
        });
        this.isModalOpen.set(true);
      },
      error: error => this.showNotice(error?.error?.message || 'Unable to load pricing details.', 'error'),
    });
  }

  closeModal(): void {
    if (this.isSubmitting()) return;
    this.isModalOpen.set(false);
    this.editingId.set(null);
    this.modalError.set(null);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    if (values.maxCC <= values.minCC) {
      this.modalError.set('Maximum CC must be greater than minimum CC.');
      this.form.controls.maxCC.setErrors({ range: true });
      return;
    }
    const payload: PricingMasterRequest = {
      insuranceCompanyId: values.insuranceCompanyId,
      agentClassId: values.agentClassId,
      vehicleTypeId: values.vehicleTypeId,
      fuelType: values.fuelType.trim() || null,
      minCC: Number(values.minCC),
      maxCC: Number(values.maxCC),
      totalPremium: Number(values.totalPremium),
      companyPayable: Number(values.companyPayable),
      agentPoints: Number(values.agentPoints),
      adminProfit: Number(values.adminProfit),
    };
    const id = this.editingId();
    this.isSubmitting.set(true);
    this.modalError.set(null);
    const request = id ? this.service.updatePricing(id, payload) : this.service.createPricing(payload);
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.modalError.set(response.message || (id ? 'Unable to update pricing.' : 'Unable to create pricing.'));
          return;
        }
        this.isModalOpen.set(false);
        this.editingId.set(null);
        this.showNotice(response.message || (id ? 'Pricing updated.' : 'Pricing created.'), 'success');
        this.loadPricing();
      },
      error: error => this.modalError.set(error?.error?.message || (id ? 'Unable to update pricing.' : 'Unable to create pricing.')),
    });
  }

  clearNotice(): void { this.notice.set(null); }

  private getFilters(): PricingMasterFilters {
    const status = this.activeFilter();
    return {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      search: this.search() || undefined,
      insuranceCompanyId: this.insuranceCompanyId() || undefined,
      agentClassId: this.agentClassId() || undefined,
      vehicleTypeId: this.vehicleTypeId() || undefined,
      fuelType: this.fuelType().trim() || undefined,
      isActive: status === 'all' ? undefined : status === 'active',
    };
  }

  private applyPage(page: PricingMasterPage, isAppend: boolean = false): void {
    const newItems = page.items || [];
    if (isAppend) {
      this.items.update(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const unique = newItems.filter(i => !existingIds.has(i.id));
        return [...prev, ...unique];
      });
    } else {
      this.items.set(newItems);
    }
    this.totalRecords.set(page.totalRecords || 0);
    this.totalPages.set(Math.max(1, page.totalPages || 1));
    this.pageNumber.set(page.pageNumber || 1);
  }

  private showNotice(message: string, type: 'success' | 'error'): void {
    this.notice.set(message);
    this.noticeType.set(type);
    setTimeout(() => { if (this.notice() === message) this.notice.set(null); }, 4000);
  }
}
