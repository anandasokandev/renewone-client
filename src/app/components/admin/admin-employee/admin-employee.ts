import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../../../services/employee/employee.service';
import { AdminEmployeeItem } from '../../../models/employee.model';

@Component({
  selector: 'app-admin-employee',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-employee.html',
  styleUrl: './admin-employee.css',
})
export class AdminEmployee implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly destroyRef = inject(DestroyRef);

  // Data state
  readonly employees = signal<AdminEmployeeItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'All' | 'Active' | 'Inactive'>('All');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(5);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly hasPreviousPage = signal<boolean>(false);
  readonly hasNextPage = signal<boolean>(false);
  readonly togglingEmployeeId = signal<string | null>(null);

  // Toast feedback & Clipboard state
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly copiedField = signal<string | null>(null);

  // Client-side quick filter over retrieved page items
  readonly filteredEmployees = computed<AdminEmployeeItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    let items = this.employees();

    if (status === 'Active') {
      items = items.filter((e) => e.status === true);
    } else if (status === 'Inactive') {
      items = items.filter((e) => e.status === false);
    }

    if (!query) return items;

    return items.filter(
      (e) =>
        e.employeeId?.toLowerCase().includes(query) ||
        e.employeeName?.toLowerCase().includes(query) ||
        (e.userName && e.userName.toLowerCase().includes(query)) ||
        e.email?.toLowerCase().includes(query) ||
        e.phoneNumber?.toLowerCase().includes(query) ||
        e.role?.toLowerCase().includes(query)
    );
  });

  // Range display calculation for pagination
  readonly showingRangeText = computed<string>(() => {
    const total = this.totalRecords();
    if (total === 0) return '0 - 0 of 0 employees';
    const start = (this.pageNumber() - 1) * this.pageSize() + 1;
    const end = Math.min(this.pageNumber() * this.pageSize(), total);
    return `${start} - ${end} of ${total} employees`;
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService
      .getAllEmployees({
        Search: this.searchQuery().trim(),
        PageNumber: this.pageNumber(),
        PageSize: this.pageSize(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.employees.set(res.data.items || []);
            this.totalRecords.set(res.data.totalRecords ?? (res.data.items?.length || 0));
            this.totalPages.set(res.data.totalPages ?? 1);
            this.pageNumber.set(res.data.pageNumber ?? 1);
            this.pageSize.set(res.data.pageSize ?? 5);
            this.hasPreviousPage.set(res.data.hasPreviousPage ?? (this.pageNumber() > 1));
            this.hasNextPage.set(res.data.hasNextPage ?? (this.pageNumber() < this.totalPages()));
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch employees.', 'error');
        },
      });
  }

  refreshEmployees(): void {
    this.loadEmployees();
    this.showToast('Employees refreshed.', 'info');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  submitSearch(): void {
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  onStatusFilterChange(status: 'All' | 'Active' | 'Inactive'): void {
    this.statusFilter.set(status);
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) {
      return;
    }
    this.pageNumber.set(newPage);
    this.loadEmployees();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  onToggleStatus(employee: AdminEmployeeItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.togglingEmployeeId() === employee.id) return;

    this.togglingEmployeeId.set(employee.id);
    const originalStatus = employee.status;
    const newStatus = !originalStatus;

    // Optimistic UI update
    this.employees.update((items) =>
      items.map((e) => (e.id === employee.id ? { ...e, status: newStatus } : e))
    );

    this.employeeService
      .toggleEmployeeStatus(employee.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingEmployeeId.set(null))
      )
      .subscribe({
        next: () => {
          this.showToast(
            `Employee "${employee.employeeName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
            'success'
          );
        },
        error: () => {
          // Revert optimistic update on failure
          this.employees.update((items) =>
            items.map((e) => (e.id === employee.id ? { ...e, status: originalStatus } : e))
          );
          this.showToast('Failed to update employee status.', 'error');
        },
      });
  }

  onManageRights(employee: AdminEmployeeItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.showToast(`Manage rights for "${employee.employeeName}" will be configured in the rights matrix.`, 'info');
  }

  onEditEmployee(employee: AdminEmployeeItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.showToast(`Edit Employee "${employee.employeeName}" will be configured next.`, 'info');
  }

  onAddEmployee(): void {
    this.showToast('Add Employee popup will be configured next.', 'info');
  }

  getUserName(item: AdminEmployeeItem): string {
    if (item.userName && item.userName.trim()) {
      return item.userName;
    }
    if (item.email && item.email.includes('@')) {
      return item.email.split('@')[0];
    }
    return item.employeeName || '—';
  }

  formatRole(role?: string): string {
    if (!role) return 'Employee';
    return role.replace(/([A-Z])/g, ' $1').trim();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  copyToClipboard(text: string, label: string): void {
    if (!text || text === '—') return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.setCopiedFeedback(text, label),
        () => this.fallbackCopy(text, label)
      );
    } else {
      this.fallbackCopy(text, label);
    }
  }

  private fallbackCopy(text: string, label: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.setCopiedFeedback(text, label);
    } catch {
      this.showToast(`Unable to copy ${label}.`, 'error');
    }
  }

  private setCopiedFeedback(text: string, label: string): void {
    this.copiedField.set(text);
    this.showToast(`Copied ${label} to clipboard.`, 'info');
    setTimeout(() => {
      if (this.copiedField() === text) {
        this.copiedField.set(null);
      }
    }, 2000);
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'info'): void {
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

  closeToast(): void {
    this.toastMessage.set(null);
  }
}
