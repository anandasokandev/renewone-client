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
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QrService } from '../../../../services/qr/qr.service';
import { BankAccountItem, QrMappingItem, UpiMasterItem } from '../../../../models/qr.model';
import { InsuranceTypeItem, VehicleTypeItem } from '../../../../models/enquiry.model';

@Component({
  selector: 'app-qr-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './qr-management.html',
  styleUrl: './qr-management.css',
})
export class QrManagement implements OnInit, AfterViewInit, OnDestroy {
  private readonly qrService = inject(QrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  @ViewChild('scrollSentinelUpi') scrollSentinelUpi?: ElementRef<HTMLElement>;
  @ViewChild('scrollSentinelMapping') scrollSentinelMapping?: ElementRef<HTMLElement>;
  private observerUpi?: IntersectionObserver;
  private observerMapping?: IntersectionObserver;

  // Active Tab Filter ('upi' | 'mappings')
  readonly activeTab = signal<'upi' | 'mappings'>('upi');

  // Status Filter signals ('all' | 'active' | 'inactive')
  readonly upiStatusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly qrMappingStatusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Toast feedback
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly copiedText = signal<string | null>(null);

  // --- Add UPI ID Modal State ---
  readonly isAddUpiModalOpen = signal<boolean>(false);
  readonly editingUpiItem = signal<UpiMasterItem | null>(null);
  readonly isSubmittingUpi = signal<boolean>(false);
  readonly bankAccounts = signal<BankAccountItem[]>([]);
  readonly isBankAccountsLoading = signal<boolean>(false);
  readonly addUpiError = signal<string | null>(null);

  readonly addUpiForm = this.fb.nonNullable.group({
    upiId: ['', [Validators.required]],
    upiName: ['', [Validators.required]],
    bankAccountId: ['', [Validators.required]],
  });

  // --- Add QR Mapping Modal State ---
  readonly isAddQrMappingModalOpen = signal<boolean>(false);
  readonly editingQrMappingItem = signal<QrMappingItem | null>(null);
  readonly isSubmittingMapping = signal<boolean>(false);
  readonly isMappingDropdownsLoading = signal<boolean>(false);
  readonly addMappingError = signal<string | null>(null);
  readonly availableQrMasters = signal<UpiMasterItem[]>([]);
  readonly availableInsuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly availableVehicleTypes = signal<VehicleTypeItem[]>([]);

  readonly addMappingForm = this.fb.nonNullable.group({
    qrMasterId: ['', [Validators.required]],
    insuranceTypeId: ['', [Validators.required]],
    vehicleTypeId: ['', [Validators.required]],
  });

  // --- SECTION 1: UPI ID's State ---
  readonly upiItems = signal<UpiMasterItem[]>([]);
  readonly isUpiLoading = signal<boolean>(false);
  readonly upiSearchQuery = signal<string>('');
  readonly upiPageNumber = signal<number>(1);
  readonly upiPageSize = signal<number>(10);
  readonly upiTotalRecords = signal<number>(0);
  readonly upiTotalPages = signal<number>(1);
  readonly togglingUpiId = signal<string | null>(null);

  readonly hasMoreUpi = computed(() => this.upiPageNumber() < this.upiTotalPages());

  // Client-side search and status filtering over retrieved items
  readonly filteredUpiItems = computed<UpiMasterItem[]>(() => {
    const query = this.upiSearchQuery().trim().toLowerCase();
    const status = this.upiStatusFilter();
    const items = this.upiItems();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.upiId?.toLowerCase().includes(query) ||
        item.upiName?.toLowerCase().includes(query) ||
        item.bankAccount?.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || (status === 'active' ? item.isActive : !item.isActive);
      return matchesSearch && matchesStatus;
    });
  });

  // --- SECTION 2: QR Mapping State ---
  readonly qrMappingItems = signal<QrMappingItem[]>([]);
  readonly isQrMappingLoading = signal<boolean>(false);
  readonly qrMappingSearchQuery = signal<string>('');
  readonly qrMappingPageNumber = signal<number>(1);
  readonly qrMappingPageSize = signal<number>(10);
  readonly qrMappingTotalRecords = signal<number>(0);
  readonly qrMappingTotalPages = signal<number>(1);
  readonly togglingQrMappingId = signal<string | null>(null);

  readonly hasMoreQrMapping = computed(() => this.qrMappingPageNumber() < this.qrMappingTotalPages());

  // Client-side search and status filtering over retrieved items
  readonly filteredQrMappingItems = computed<QrMappingItem[]>(() => {
    const query = this.qrMappingSearchQuery().trim().toLowerCase();
    const status = this.qrMappingStatusFilter();
    const items = this.qrMappingItems();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.qrName?.toLowerCase().includes(query) ||
        item.bankName?.toLowerCase().includes(query) ||
        item.insuranceType?.toLowerCase().includes(query) ||
        item.vehicleType?.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || (status === 'active' ? item.isActive : !item.isActive);
      return matchesSearch && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.loadUpiMasters();
    this.loadQrMappings();
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObservers();
  }

  ngOnDestroy(): void {
    this.observerUpi?.disconnect();
    this.observerMapping?.disconnect();
  }

  setActiveTab(tab: 'upi' | 'mappings'): void {
    this.activeTab.set(tab);
    setTimeout(() => this.setupIntersectionObservers(), 60);
  }

  private setupIntersectionObservers(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    if (this.scrollSentinelUpi?.nativeElement) {
      this.observerUpi?.disconnect();
      this.observerUpi = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.loadMoreUpi();
          }
        },
        { rootMargin: '120px' }
      );
      this.observerUpi.observe(this.scrollSentinelUpi.nativeElement);
    }

    if (this.scrollSentinelMapping?.nativeElement) {
      this.observerMapping?.disconnect();
      this.observerMapping = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.loadMoreQrMappings();
          }
        },
        { rootMargin: '120px' }
      );
      this.observerMapping.observe(this.scrollSentinelMapping.nativeElement);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 160;
    if (scrollPosition >= threshold) {
      if (this.activeTab() === 'upi') {
        this.loadMoreUpi();
      } else {
        this.loadMoreQrMappings();
      }
    }
  }

  // --- UPI ID's Methods ---
  loadUpiMasters(isAppend = false): void {
    this.isUpiLoading.set(true);
    this.qrService
      .getQrMasters({
        pageNumber: this.upiPageNumber(),
        pageSize: this.upiPageSize(),
        search: this.upiSearchQuery().trim() || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isUpiLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            const newItems = res.data.items || [];
            if (isAppend) {
              this.upiItems.update((existing) => [...existing, ...newItems]);
            } else {
              this.upiItems.set(newItems);
            }
            this.upiTotalRecords.set(res.data.totalRecords ?? 0);
            this.upiTotalPages.set(res.data.totalPages ?? 1);
            this.upiPageNumber.set(res.data.pageNumber ?? 1);
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to load UPI IDs.', 'error');
        },
      });
  }

  loadMoreUpi(): void {
    if (!this.hasMoreUpi() || this.isUpiLoading()) return;
    this.upiPageNumber.update((p) => p + 1);
    this.loadUpiMasters(true);
  }

  refreshUpiMasters(): void {
    this.upiPageNumber.set(1);
    this.loadUpiMasters(false);
    this.showToast('UPI IDs refreshed.', 'info');
  }

  onUpiSearchChange(query: string): void {
    this.upiSearchQuery.set(query);
    this.upiPageNumber.set(1);
    this.loadUpiMasters(false);
  }

  clearUpiSearch(): void {
    this.upiSearchQuery.set('');
    this.upiPageNumber.set(1);
    this.loadUpiMasters(false);
  }

  setUpiStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.upiStatusFilter.set(status);
  }

  onToggleUpiStatus(item: UpiMasterItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.togglingUpiId() === item.id) return;

    this.togglingUpiId.set(item.id);
    const originalStatus = item.isActive;
    const newStatus = !originalStatus;

    // Optimistic update
    this.upiItems.update((items) =>
      items.map((i) => (i.id === item.id ? { ...i, isActive: newStatus } : i))
    );

    this.qrService
      .toggleQrMasterStatus(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingUpiId.set(null))
      )
      .subscribe({
        next: () => {
          this.showToast(
            `UPI ID "${item.upiName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
            'success'
          );
        },
        error: () => {
          // Revert optimistic update
          this.upiItems.update((items) =>
            items.map((i) => (i.id === item.id ? { ...i, isActive: originalStatus } : i))
          );
          this.showToast('Failed to update UPI status.', 'error');
        },
      });
  }

  onUpiPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.upiTotalPages() || newPage === this.upiPageNumber()) return;
    this.upiPageNumber.set(newPage);
    this.loadUpiMasters();
  }

  onUpiPageSizeChange(newSize: number): void {
    this.upiPageSize.set(Number(newSize));
    this.upiPageNumber.set(1);
    this.loadUpiMasters();
  }

  openAddUpiModal(): void {
    this.editingUpiItem.set(null);
    this.addUpiError.set(null);
    this.addUpiForm.reset({
      upiId: '',
      upiName: '',
      bankAccountId: '',
    });
    this.isAddUpiModalOpen.set(true);
    if (this.bankAccounts().length === 0) {
      this.loadBankAccounts();
    }
  }

  openEditUpiModal(item: UpiMasterItem): void {
    this.editingUpiItem.set(item);
    this.addUpiError.set(null);
    this.addUpiForm.reset({
      upiId: item.upiId,
      upiName: item.upiName,
      bankAccountId: item.bankAccountId,
    });
    this.isAddUpiModalOpen.set(true);
    if (this.bankAccounts().length === 0) this.loadBankAccounts();
  }

  onUpiRowKeydown(event: KeyboardEvent, item: UpiMasterItem): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openEditUpiModal(item);
  }

  closeAddUpiModal(force: boolean = false): void {
    if (this.isSubmittingUpi() && !force) return;
    this.isAddUpiModalOpen.set(false);
    this.editingUpiItem.set(null);
    this.addUpiError.set(null);
    this.addUpiForm.reset({
      upiId: '',
      upiName: '',
      bankAccountId: '',
    });
  }

  loadBankAccounts(): void {
    this.isBankAccountsLoading.set(true);
    this.qrService
      .getBankAccounts({ pageSize: 50 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBankAccountsLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.bankAccounts.set(res.data.items || []);
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch bank accounts.', 'error');
        },
      });
  }

  submitAddUpi(): void {
    if (this.addUpiForm.invalid) {
      this.addUpiForm.markAllAsTouched();
      return;
    }

    const { upiId, upiName, bankAccountId } = this.addUpiForm.getRawValue();

    this.isSubmittingUpi.set(true);
    this.addUpiError.set(null);

    const editingItem = this.editingUpiItem();
    const payload = {
      upiId: upiId.trim(),
      upiName: upiName.trim(),
      bankAccountId: bankAccountId.trim(),
    };
    const saveRequest = editingItem
      ? this.qrService.updateQrMaster(editingItem.id, { id: editingItem.id, ...payload, isActive: editingItem.isActive })
      : this.qrService.createQrMaster(payload);

    saveRequest
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingUpi.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.isSubmittingUpi.set(false);
            this.closeAddUpiModal(true);
            this.showToast(res.message || (editingItem ? 'QR Master updated successfully.' : 'QR Master created successfully.'), 'success');
            this.loadUpiMasters();
          } else {
            this.addUpiError.set(res.message || (editingItem ? 'Failed to update QR Master.' : 'Failed to create QR Master.'));
          }
        },
        error: (err) => {
          this.addUpiError.set(
            err?.error?.message || (editingItem ? 'An error occurred while updating the UPI ID.' : 'An error occurred while creating the UPI ID.')
          );
        },
      });
  }

  // --- QR Mapping Methods ---
  loadQrMappings(isAppend = false): void {
    this.isQrMappingLoading.set(true);
    this.qrService
      .getQrMappings({
        pageNumber: this.qrMappingPageNumber(),
        pageSize: this.qrMappingPageSize(),
        search: this.qrMappingSearchQuery().trim() || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isQrMappingLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            const newItems = res.data.items || [];
            if (isAppend) {
              this.qrMappingItems.update((existing) => [...existing, ...newItems]);
            } else {
              this.qrMappingItems.set(newItems);
            }
            this.qrMappingTotalRecords.set(res.data.totalRecords ?? 0);
            this.qrMappingTotalPages.set(res.data.totalPages ?? 1);
            this.qrMappingPageNumber.set(res.data.pageNumber ?? 1);
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to load QR Mappings.', 'error');
        },
      });
  }

  loadMoreQrMappings(): void {
    if (!this.hasMoreQrMapping() || this.isQrMappingLoading()) return;
    this.qrMappingPageNumber.update((p) => p + 1);
    this.loadQrMappings(true);
  }

  refreshQrMappings(): void {
    this.qrMappingPageNumber.set(1);
    this.loadQrMappings(false);
    this.showToast('QR Mappings refreshed.', 'info');
  }

  onQrMappingSearchChange(query: string): void {
    this.qrMappingSearchQuery.set(query);
    this.qrMappingPageNumber.set(1);
    this.loadQrMappings(false);
  }

  clearQrMappingSearch(): void {
    this.qrMappingSearchQuery.set('');
    this.qrMappingPageNumber.set(1);
    this.loadQrMappings(false);
  }

  setQrMappingStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.qrMappingStatusFilter.set(status);
  }

  onToggleQrMappingStatus(item: QrMappingItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.togglingQrMappingId() === item.id) return;

    this.togglingQrMappingId.set(item.id);
    const originalStatus = item.isActive;
    const newStatus = !originalStatus;

    // Optimistic update
    this.qrMappingItems.update((items) =>
      items.map((i) => (i.id === item.id ? { ...i, isActive: newStatus } : i))
    );

    this.qrService
      .toggleQrMappingStatus(item.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingQrMappingId.set(null))
      )
      .subscribe({
        next: () => {
          this.showToast(
            `QR Mapping "${item.qrName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
            'success'
          );
        },
        error: () => {
          // Revert optimistic update
          this.qrMappingItems.update((items) =>
            items.map((i) => (i.id === item.id ? { ...i, isActive: originalStatus } : i))
          );
          this.showToast('Failed to update QR Mapping status.', 'error');
        },
      });
  }

  onQrMappingPageChange(newPage: number): void {
    if (
      newPage < 1 ||
      newPage > this.qrMappingTotalPages() ||
      newPage === this.qrMappingPageNumber()
    )
      return;
    this.qrMappingPageNumber.set(newPage);
    this.loadQrMappings();
  }

  onQrMappingPageSizeChange(newSize: number): void {
    this.qrMappingPageSize.set(Number(newSize));
    this.qrMappingPageNumber.set(1);
    this.loadQrMappings();
  }

  onQrMappingRowKeydown(event: KeyboardEvent, item: QrMappingItem): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openEditQrMappingModal(item);
  }

  openAddQrMappingModal(): void {
    this.editingQrMappingItem.set(null);
    this.addMappingError.set(null);
    this.addMappingForm.reset({
      qrMasterId: '',
      insuranceTypeId: '',
      vehicleTypeId: '',
    });
    this.isAddQrMappingModalOpen.set(true);
    this.loadMappingDropdowns();
  }

  openEditQrMappingModal(item: QrMappingItem): void {
    this.editingQrMappingItem.set(item);
    this.addMappingError.set(null);
    this.addMappingForm.reset({
      qrMasterId: item.qrMasterId,
      insuranceTypeId: item.insuranceTypeId,
      vehicleTypeId: item.vehicleTypeId,
    });
    this.isAddQrMappingModalOpen.set(true);
    this.loadMappingDropdowns();
  }

  closeAddQrMappingModal(force: boolean = false): void {
    if (this.isSubmittingMapping() && !force) return;
    this.isAddQrMappingModalOpen.set(false);
    this.editingQrMappingItem.set(null);
    this.addMappingError.set(null);
    this.addMappingForm.reset({
      qrMasterId: '',
      insuranceTypeId: '',
      vehicleTypeId: '',
    });
  }

  loadMappingDropdowns(): void {
    this.isMappingDropdownsLoading.set(true);
    forkJoin({
      masters: this.qrService.getQrMasters({ pageSize: 100 }),
      insuranceTypes: this.qrService.getInsuranceTypes(),
      vehicleTypes: this.qrService.getVehicleTypes(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isMappingDropdownsLoading.set(false))
      )
      .subscribe({
        next: ({ masters, insuranceTypes, vehicleTypes }) => {
          if (masters?.data?.items) {
            this.availableQrMasters.set(masters.data.items);
          }
          if (insuranceTypes?.data) {
            this.availableInsuranceTypes.set(insuranceTypes.data);
          }
          if (vehicleTypes?.data) {
            this.availableVehicleTypes.set(vehicleTypes.data);
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to load options for QR Mapping.', 'error');
        },
      });
  }

  submitAddMapping(): void {
    if (this.addMappingForm.invalid) {
      this.addMappingForm.markAllAsTouched();
      return;
    }

    const { qrMasterId, insuranceTypeId, vehicleTypeId } = this.addMappingForm.getRawValue();

    this.isSubmittingMapping.set(true);
    this.addMappingError.set(null);

    const editingItem = this.editingQrMappingItem();
    const payload = {
      qrMasterId: qrMasterId.trim(),
      insuranceTypeId: insuranceTypeId.trim(),
      vehicleTypeId: vehicleTypeId.trim(),
    };
    const saveRequest = editingItem
      ? this.qrService.updateQrMapping(editingItem.id, { id: editingItem.id, ...payload, isActive: editingItem.isActive })
      : this.qrService.createQrMapping(payload);

    saveRequest
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingMapping.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.isSubmittingMapping.set(false);
            this.closeAddQrMappingModal(true);
            this.showToast(res.message || (editingItem ? 'QR Mapping updated successfully.' : 'QR Mapping created successfully.'), 'success');
            this.loadQrMappings();
          } else {
            this.addMappingError.set(res.message || (editingItem ? 'Failed to update QR Mapping.' : 'Failed to create QR Mapping.'));
          }
        },
        error: (err) => {
          this.addMappingError.set(
            err?.error?.message || (editingItem ? 'An error occurred while updating the QR Mapping.' : 'An error occurred while creating the QR Mapping.')
          );
        },
      });
  }

  // --- Utility Methods ---
  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedText.set(text);
      this.showToast(`Copied ${label} to clipboard.`, 'success');
      setTimeout(() => {
        if (this.copiedText() === text) {
          this.copiedText.set(null);
        }
      }, 2000);
    });
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }

  clearToast(): void {
    this.toastMessage.set(null);
  }
}
