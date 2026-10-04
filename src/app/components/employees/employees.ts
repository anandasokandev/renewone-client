import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth/auth';
import { StaffService } from '../../services/staff/staff.service';
import { CreateStaffRequest, StaffItem, StaffPagedResult } from '../../models/staff.model';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class Employees implements OnInit {
  private staffService = inject(StaffService);
  private authService = inject(Auth);

  // Paged state
  readonly staffItems = signal<StaffItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(4);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly hasPreviousPage = signal<boolean>(false);
  readonly hasNextPage = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<boolean | null>(null); // null = All, true = Active, false = Inactive

  // Metrics from API response
  readonly totalStaffCount = signal<number | null>(null);
  readonly activeStaffCount = signal<number | null>(null);
  readonly inactiveStaffCount = signal<number | null>(null);

  // Computed metrics (prefer API counts, fallback to local staff items)
  readonly allStaffCount = computed(() =>
    this.totalStaffCount() !== null ? this.totalStaffCount()! : this.totalRecords()
  );
  readonly activeCount = computed(() =>
    this.activeStaffCount() !== null
      ? this.activeStaffCount()!
      : this.staffItems().filter(s => s.isActive).length
  );
  readonly inactiveCount = computed(() =>
    this.inactiveStaffCount() !== null
      ? this.inactiveStaffCount()!
      : this.staffItems().filter(s => !s.isActive).length
  );

  // Modal and Toast
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly togglingId = signal<string | null>(null);
  readonly createError = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  // Form Model
  newStaff: CreateStaffRequest = {
    userName: '',
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    accountId: '',
  };

  ngOnInit(): void {
    this.fetchStaff();
  }

  getAccountId(): string {
    const raw = sessionStorage.getItem('accountId');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      } catch {
        return raw;
      }
    }
    return this.authService.currentUser()?.accountId || '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  }

  fetchStaff(): void {
    const accountId = this.getAccountId();
    this.loading.set(true);

    this.staffService
      .getStaffList(accountId, {
        search: this.searchQuery(),
        status: this.statusFilter(),
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: res => {
          this.loading.set(false);
          if (res.isSuccess && res.data) {
            const staffData: StaffPagedResult | undefined = res.data.staff || (res.data as any);
            if (staffData) {
              this.staffItems.set(staffData.items || []);
              this.pageNumber.set(staffData.pageNumber || 1);
              this.pageSize.set(staffData.pageSize || 4);
              this.totalRecords.set(staffData.totalRecords || 0);
              this.totalPages.set(staffData.totalPages || 1);
              this.hasPreviousPage.set(!!staffData.hasPreviousPage);
              this.hasNextPage.set(!!staffData.hasNextPage);
            }
            if (res.data.totalStaff !== undefined) {
              this.totalStaffCount.set(res.data.totalStaff);
            }
            if (res.data.activeStaff !== undefined) {
              this.activeStaffCount.set(res.data.activeStaff);
            }
            if (res.data.inactiveStaff !== undefined) {
              this.inactiveStaffCount.set(res.data.inactiveStaff);
            }
          }
        },
        error: err => {
          this.loading.set(false);
          console.error('Failed to load staff:', err);
        },
      });
  }

  onSearchChange(term: string): void {
    this.searchQuery.set(term);
    this.pageNumber.set(1);
    this.fetchStaff();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.fetchStaff();
  }

  setStatus(status: boolean | null): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.fetchStaff();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.fetchStaff();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.pageNumber()) {
      this.pageNumber.set(page);
      this.fetchStaff();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.pageNumber.update(p => p - 1);
      this.fetchStaff();
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.pageNumber.update(p => p + 1);
      this.fetchStaff();
    }
  }

  openCreateModal(): void {
    this.newStaff = {
      userName: '',
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      accountId: this.getAccountId(),
    };
    this.createError.set(null);
    this.showPassword.set(false);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitNewStaff(): void {
    if (
      !this.newStaff.userName ||
      !this.newStaff.fullName ||
      !this.newStaff.email ||
      !this.newStaff.password ||
      !this.newStaff.phoneNumber
    ) {
      this.createError.set('Please fill in all required fields.');
      return;
    }

    this.newStaff.accountId = this.getAccountId();
    this.isSubmitting.set(true);
    this.createError.set(null);

    this.staffService.createStaff(this.newStaff).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        if (res.isSuccess) {
          this.closeCreateModal();
          this.showNotice(`Staff member "${this.newStaff.fullName}" created successfully.`);
          this.fetchStaff();
        } else {
          this.createError.set(res.message || 'Failed to create staff member.');
        }
      },
      error: err => {
        this.isSubmitting.set(false);
        this.createError.set(err?.error?.message || 'Server error occurred during staff creation.');
      },
    });
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  copyToClipboard(text: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard?.writeText(text);
    this.showNotice(`Copied: ${text}`);
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onToggleStatus(staff: StaffItem, event?: Event): void {
    event?.stopPropagation();
    const accountId = this.getAccountId();
    this.togglingId.set(staff.id);

    const previousState = staff.isActive;
    const newState = !previousState;

    // Optimistic UI update
    this.staffItems.update(items =>
      items.map(s => (s.id === staff.id ? { ...s, isActive: newState } : s))
    );

    this.staffService.toggleStaffStatus(accountId, staff.id).subscribe({
      next: res => {
        this.togglingId.set(null);
        if (res.isSuccess) {
          const actionText = newState ? 'activated' : 'deactivated';
          this.showNotice(`Staff "${staff.fullName}" ${actionText} successfully.`);
          this.fetchStaff();
        } else {
          // Revert optimistic update
          this.staffItems.update(items =>
            items.map(s => (s.id === staff.id ? { ...s, isActive: previousState } : s))
          );
          this.showNotice(res.message || 'Failed to update status.');
        }
      },
      error: err => {
        this.togglingId.set(null);
        // Revert optimistic update
        this.staffItems.update(items =>
          items.map(s => (s.id === staff.id ? { ...s, isActive: previousState } : s))
        );
        this.showNotice(err?.error?.message || 'Error updating staff status.');
      },
    });
  }

  private showNotice(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
