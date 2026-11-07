import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateVendorRequest, Vendor } from '../../../../models/vendor.model';
import { VendorService } from '../../../../services/vendor/vendor.service';

type VendorStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-vendor-management',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.css',
})
export class VendorManagement implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly vendors = signal<Vendor[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<VendorStatusFilter>('all');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);
  readonly isModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingVendorId = signal<string | null>(null);
  readonly loadingVendorId = signal<string | null>(null);
  readonly togglingVendorId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error' | 'info'>('success');

  readonly vendorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    phone: ['', [Validators.required, Validators.maxLength(25), Validators.pattern(/^\+?[\d\s().-]{7,25}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });

  readonly activeCount = computed(() => this.vendors().filter(vendor => vendor.isActive).length);
  readonly inactiveCount = computed(() => this.vendors().length - this.activeCount());
  readonly filteredVendors = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    return this.vendors().filter(vendor => {
      const matchesSearch = !search ||
        vendor.name.toLowerCase().includes(search) ||
        vendor.code.toLowerCase().includes(search) ||
        vendor.phone.toLowerCase().includes(search) ||
        vendor.email.toLowerCase().includes(search);
      const matchesStatus = status === 'all' || (status === 'active' ? vendor.isActive : !vendor.isActive);
      return matchesSearch && matchesStatus;
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredVendors().length / this.pageSize())));
  readonly pageStart = computed(() => this.filteredVendors().length ? (this.pageNumber() - 1) * this.pageSize() + 1 : 0);
  readonly pageEnd = computed(() => Math.min(this.pageNumber() * this.pageSize(), this.filteredVendors().length));
  readonly pagedVendors = computed(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filteredVendors().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.isLoading.set(true);
    this.vendorService.getVendors()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: response => {
          if (response.isSuccess && response.data) {
            this.vendors.set(response.data);
            this.clampPage();
          } else {
            this.showToast(response.message || 'Unable to load vendors.', 'error');
          }
        },
        error: error => this.showToast(error?.error?.message || 'Unable to load vendors.', 'error'),
      });
  }

  refresh(): void {
    this.loadVendors();
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.pageNumber.set(1);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value as VendorStatusFilter);
    this.pageNumber.set(1);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.pageNumber.set(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageNumber.set(page);
  }

  openCreateModal(): void {
    this.editingVendorId.set(null);
    this.formError.set(null);
    this.vendorForm.reset({ name: '', code: '', phone: '', email: '' });
    this.vendorForm.controls.code.disable();
    this.isModalOpen.set(true);
  }

  openEditModal(vendor: Vendor): void {
    if (this.loadingVendorId()) return;
    this.loadingVendorId.set(vendor.id);
    this.vendorService.getVendor(vendor.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingVendorId.set(null))
      )
      .subscribe({
        next: response => {
          if (!response.isSuccess || !response.data) {
            this.showToast(response.message || 'Unable to load vendor details.', 'error');
            return;
          }
          const current = response.data;
          this.editingVendorId.set(current.id);
          this.formError.set(null);
          this.vendorForm.controls.code.enable();
          this.vendorForm.reset({
            name: current.name,
            code: current.code,
            phone: current.phone,
            email: current.email,
          });
          this.isModalOpen.set(true);
        },
        error: error => this.showToast(error?.error?.message || 'Unable to load vendor details.', 'error'),
      });
  }

  closeModal(force = false): void {
    if (this.isSubmitting() && !force) return;
    this.isModalOpen.set(false);
    this.editingVendorId.set(null);
    this.formError.set(null);
    this.vendorForm.reset({ name: '', code: '', phone: '', email: '' });
    this.vendorForm.controls.code.disable();
  }

  submitVendor(): void {
    if (this.vendorForm.invalid || this.isSubmitting()) {
      this.vendorForm.markAllAsTouched();
      return;
    }

    const value = this.vendorForm.getRawValue();
    const editId = this.editingVendorId();
    this.isSubmitting.set(true);
    this.formError.set(null);

    const request: CreateVendorRequest = {
      name: value.name.trim(),
      phone: value.phone.trim(),
      email: value.email.trim().toLowerCase(),
    };

    const operation = editId
      ? this.vendorService.updateVendor(editId, {
          ...request,
          code: value.code.trim().toUpperCase(),
          isActive: this.vendors().find(vendor => vendor.id === editId)?.isActive ?? true,
        })
      : this.vendorService.createVendor(request);

    operation
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: response => {
          if (!response.isSuccess) {
            this.formError.set(response.message || (editId ? 'Unable to update vendor.' : 'Unable to create vendor.'));
            return;
          }
          this.closeModal(true);
          this.showToast(response.message || (editId ? 'Vendor updated successfully.' : 'Vendor created successfully.'), 'success');
          this.loadVendors();
        },
        error: error => this.formError.set(
          error?.error?.message || (editId ? 'An error occurred while updating the vendor.' : 'An error occurred while creating the vendor.')
        ),
      });
  }

  toggleStatus(vendor: Vendor): void {
    if (this.togglingVendorId()) return;
    this.togglingVendorId.set(vendor.id);
    this.vendorService.toggleVendorStatus(vendor.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.togglingVendorId.set(null)))
      .subscribe({
        next: response => {
          if (!response.isSuccess) {
            this.showToast(response.message || 'Unable to change vendor status.', 'error');
            return;
          }
          const isActive = response.data;
          this.vendors.update(items => items.map(item => item.id === vendor.id ? { ...item, isActive } : item));
          this.clampPage();
          this.showToast(`${vendor.name} is now ${isActive ? 'active' : 'inactive'}.`, 'success');
        },
        error: error => this.showToast(error?.error?.message || 'Unable to change vendor status.', 'error'),
      });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) this.toastMessage.set(null);
    }, 3500);
  }

  clearToast(): void {
    this.toastMessage.set(null);
  }

  private clampPage(): void {
    this.pageNumber.set(Math.min(this.pageNumber(), this.totalPages()));
  }
}
