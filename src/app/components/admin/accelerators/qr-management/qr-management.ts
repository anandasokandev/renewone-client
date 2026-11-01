import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
export class QrManagement implements OnInit {
  private readonly qrService = inject(QrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  // Active Tab Filter ('upi' | 'mappings')
  readonly activeTab = signal<'upi' | 'mappings'>('upi');

  // Toast feedback
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly copiedText = signal<string | null>(null);

  // --- Add UPI ID Modal State ---
  readonly isAddUpiModalOpen = signal<boolean>(false);
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

  // Client-side search filtering over retrieved items
  readonly filteredUpiItems = computed<UpiMasterItem[]>(() => {
    const query = this.upiSearchQuery().trim().toLowerCase();
    const items = this.upiItems();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.upiId?.toLowerCase().includes(query) ||
        item.upiName?.toLowerCase().includes(query) ||
        item.bankAccount?.toLowerCase().includes(query)
    );
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

  // Client-side search filtering over retrieved items
  readonly filteredQrMappingItems = computed<QrMappingItem[]>(() => {
    const query = this.qrMappingSearchQuery().trim().toLowerCase();
    const items = this.qrMappingItems();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.qrName?.toLowerCase().includes(query) ||
        item.bankName?.toLowerCase().includes(query) ||
        item.insuranceType?.toLowerCase().includes(query) ||
        item.vehicleType?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadUpiMasters();
    this.loadQrMappings();
  }

  // --- UPI ID's Methods ---
  loadUpiMasters(): void {
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
            this.upiItems.set(res.data.items || []);
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

  refreshUpiMasters(): void {
    this.loadUpiMasters();
    this.showToast('UPI IDs refreshed.', 'info');
  }

  onUpiSearchChange(query: string): void {
    this.upiSearchQuery.set(query);
  }

  clearUpiSearch(): void {
    this.upiSearchQuery.set('');
    this.upiPageNumber.set(1);
    this.loadUpiMasters();
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

  closeAddUpiModal(force: boolean = false): void {
    if (this.isSubmittingUpi() && !force) return;
    this.isAddUpiModalOpen.set(false);
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

    this.qrService
      .createQrMaster({
        upiId: upiId.trim(),
        upiName: upiName.trim(),
        bankAccountId: bankAccountId.trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingUpi.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.isSubmittingUpi.set(false);
            this.closeAddUpiModal(true);
            this.showToast(res.message || 'QR Master created successfully.', 'success');
            this.loadUpiMasters();
          } else {
            this.addUpiError.set(res.message || 'Failed to create QR Master.');
          }
        },
        error: (err) => {
          this.addUpiError.set(
            err?.error?.message || 'An error occurred while creating the UPI ID.'
          );
        },
      });
  }

  // --- QR Mapping Methods ---
  loadQrMappings(): void {
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
            this.qrMappingItems.set(res.data.items || []);
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

  refreshQrMappings(): void {
    this.loadQrMappings();
    this.showToast('QR Mappings refreshed.', 'info');
  }

  onQrMappingSearchChange(query: string): void {
    this.qrMappingSearchQuery.set(query);
  }

  clearQrMappingSearch(): void {
    this.qrMappingSearchQuery.set('');
    this.qrMappingPageNumber.set(1);
    this.loadQrMappings();
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

  openAddQrMappingModal(): void {
    this.addMappingError.set(null);
    this.addMappingForm.reset({
      qrMasterId: '',
      insuranceTypeId: '',
      vehicleTypeId: '',
    });
    this.isAddQrMappingModalOpen.set(true);
    this.loadMappingDropdowns();
  }

  closeAddQrMappingModal(force: boolean = false): void {
    if (this.isSubmittingMapping() && !force) return;
    this.isAddQrMappingModalOpen.set(false);
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

    this.qrService
      .createQrMapping({
        qrMasterId: qrMasterId.trim(),
        insuranceTypeId: insuranceTypeId.trim(),
        vehicleTypeId: vehicleTypeId.trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingMapping.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.isSubmittingMapping.set(false);
            this.closeAddQrMappingModal(true);
            this.showToast(res.message || 'QR Mapping created successfully.', 'success');
            this.loadQrMappings();
          } else {
            this.addMappingError.set(res.message || 'Failed to create QR Mapping.');
          }
        },
        error: (err) => {
          this.addMappingError.set(
            err?.error?.message || 'An error occurred while creating the QR Mapping.'
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
