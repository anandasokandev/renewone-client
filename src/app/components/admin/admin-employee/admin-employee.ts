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
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { EmployeeService } from '../../../services/employee/employee.service';
import { ADMIN_USER_TYPES } from '../../../models/auth.model';
import {
  AdminEmployeeItem,
  CreateInternalUserPayload,
  GetAllEmployeesPayload,
  UpdateEmployeePayload,
  UpdateEmployeeRightsPayload,
  WorkAllocationPayload,
} from '../../../models/employee.model';
import { InsuranceTypeItem, VehicleTypeItem } from '../../../models/enquiry.model';

type EmployeeModalMode = 'add' | 'edit' | 'rights';
type ToastType = 'success' | 'info' | 'error';

@Component({
  selector: 'app-admin-employee',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-employee.html',
  styleUrl: './admin-employee.css',
})
export class AdminEmployee implements OnInit, AfterViewInit, OnDestroy {
  private readonly employeeService = inject(EmployeeService);
  private readonly enquiryService = inject(EnquiryService);
  private readonly destroyRef = inject(DestroyRef);

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

  // Infinite Scroll for Small Screens
  readonly hasMoreEmployees = computed(() => this.pageNumber() < this.totalPages());
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;

  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<ToastType>('success');
  readonly copiedField = signal<string | null>(null);

  readonly modalMode = signal<EmployeeModalMode | null>(null);
  readonly modalEmployee = signal<AdminEmployeeItem | null>(null);
  readonly modalSubmitting = signal(false);
  readonly rulesLoading = signal(false);
  readonly employeeRightsLoading = signal(false);
  readonly rulesError = signal<string | null>(null);
  readonly employeeRightsError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly submitAttempted = signal(false);

  readonly fullName = signal('');
  readonly userName = signal('');
  readonly email = signal('');
  readonly phoneNumber = signal('');
  readonly password = signal('');
  readonly userType = signal('AdminEmployee');

  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);
  readonly modulePermissions = signal<string[]>([]);
  readonly selectedInsuranceTypeIds = signal<string[]>([]);
  readonly selectedVehicleTypeIds = signal<Record<string, string[]>>({});

  readonly availableModules = [
    'Dashboard',
    'Enquiries',
    'Employees',
    'Agents',
    'Reports',
    'Accelerators',
  ];
  readonly availableUserTypes = ADMIN_USER_TYPES;

  readonly filteredEmployees = computed<AdminEmployeeItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    let items = this.employees();

    if (status === 'Active') items = items.filter((employee) => employee.status);
    if (status === 'Inactive') items = items.filter((employee) => !employee.status);
    if (!query) return items;

    return items.filter((employee) =>
      [
        employee.employeeId,
        employee.employeeName,
        employee.userName,
        employee.email,
        employee.phoneNumber,
        employee.role,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  });

  readonly showingRangeText = computed<string>(() => {
    const total = this.totalRecords();
    if (total === 0) return '0 - 0 of 0 employees';
    const start = (this.pageNumber() - 1) * this.pageSize() + 1;
    const end = Math.min(this.pageNumber() * this.pageSize(), total);
    return `${start} - ${end} of ${total} employees`;
  });

  readonly hasValidIdentity = computed(() => {
    const email = this.email().trim();
    const identityValid = !!this.fullName().trim() && !!this.phoneNumber().trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (this.modalMode() === 'edit') return identityValid;
    return identityValid && !!this.userName().trim() && this.password().length >= 8 && this.availableUserTypes.some((role) => role === this.userType());
  });

  readonly hasValidRules = computed(() =>
    this.modulePermissions().length > 0 && this.selectedInsuranceTypeIds().length > 0
  );

  readonly canSubmitModal = computed(() => {
    const mode = this.modalMode();
    if (!mode || this.modalSubmitting()) return false;
    if (mode === 'edit') return true;
    return !this.rulesLoading() && !this.employeeRightsLoading() && !this.rulesError() && !this.employeeRightsError();
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.hasMoreEmployees() || this.isLoading()) return;
    const scrollPos = window.innerHeight + window.scrollY;
    const bodyHeight = document.documentElement.scrollHeight;
    if (bodyHeight - scrollPos < 200) {
      this.loadMoreEmployees();
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreEmployees();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  loadMoreEmployees(): void {
    if (!this.hasMoreEmployees() || this.isLoading()) return;
    this.pageNumber.update(p => p + 1);
    this.loadEmployees(true);
    setTimeout(() => {
      if (this.scrollSentinel?.nativeElement && this.observer) {
        this.observer.observe(this.scrollSentinel.nativeElement);
      }
    }, 50);
  }

  loadEmployees(isAppend = false): void {
    this.isLoading.set(true);
    const payload: GetAllEmployeesPayload = {
      Search: this.searchQuery().trim(),
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize(),
    };
    this.employeeService
      .getAllEmployees(payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess || !response.data) {
            this.showToast(response.message || 'Failed to fetch employees.', 'error');
            return;
          }
          const items = response.data.items || [];
          if (isAppend) {
            this.employees.update(current => [...current, ...items]);
          } else {
            this.employees.set(items);
          }
          this.totalRecords.set(response.data.totalRecords ?? (this.employees().length));
          this.totalPages.set(response.data.totalPages ?? 1);
          this.pageNumber.set(response.data.pageNumber ?? 1);
          this.pageSize.set(response.data.pageSize ?? 5);
          this.hasPreviousPage.set(response.data.hasPreviousPage ?? this.pageNumber() > 1);
          this.hasNextPage.set(response.data.hasNextPage ?? this.pageNumber() < this.totalPages());
        },
        error: (error) => this.showToast(this.getErrorMessage(error, 'Failed to fetch employees.'), 'error'),
      });
  }

  refreshEmployees(): void {
    this.pageNumber.set(1);
    this.loadEmployees(false);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  submitSearch(): void {
    this.pageNumber.set(1);
    this.loadEmployees(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadEmployees(false);
  }

  onStatusFilterChange(status: 'All' | 'Active' | 'Inactive'): void {
    this.statusFilter.set(status);
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) return;
    this.pageNumber.set(newPage);
    this.loadEmployees();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadEmployees();
  }

  onToggleStatus(employee: AdminEmployeeItem, event?: Event): void {
    event?.stopPropagation();
    if (this.togglingEmployeeId() === employee.id) return;

    const originalStatus = employee.status;
    const newStatus = !originalStatus;
    this.togglingEmployeeId.set(employee.id);
    this.employees.update((items) => items.map((item) => item.id === employee.id ? { ...item, status: newStatus } : item));

    this.employeeService
      .toggleEmployeeStatus(employee.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.togglingEmployeeId.set(null)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.revertEmployeeStatus(employee.id, originalStatus);
            this.showToast(response.message || 'Failed to update employee status.', 'error');
            return;
          }
          this.showToast(`Employee "${employee.employeeName}" is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
        },
        error: (error) => {
          this.revertEmployeeStatus(employee.id, originalStatus);
          this.showToast(this.getErrorMessage(error, 'Failed to update employee status.'), 'error');
        },
      });
  }

  onManageRights(employee: AdminEmployeeItem, event?: Event): void {
    event?.stopPropagation();
    this.resetModalState();
    this.modalMode.set('rights');
    this.modalEmployee.set(employee);
    this.loadRuleOptions();
    this.loadEmployeeRights(employee);
  }

  reloadEmployeeRights(): void {
    const employee = this.modalEmployee();
    if (employee) this.loadEmployeeRights(employee);
  }

  private loadEmployeeRights(employee: AdminEmployeeItem): void {
    this.employeeRightsLoading.set(true);
    this.employeeRightsError.set(null);
    this.employeeService
      .getEmployeeRights(employee.id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.employeeRightsLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess || !response.data) {
            this.employeeRightsError.set(response.message || 'Unable to load employee rules.');
            return;
          }
          this.modulePermissions.set(response.data.modulePermissions ?? []);
          this.selectedInsuranceTypeIds.set((response.data.workAllocations ?? []).map((allocation) => allocation.insuranceTypeId));
          this.selectedVehicleTypeIds.set(Object.fromEntries(
            (response.data.workAllocations ?? []).map((allocation) => [allocation.insuranceTypeId, allocation.vehicleTypeIds ?? []])
          ));
        },
        error: (error) => this.employeeRightsError.set(this.getErrorMessage(error, 'Unable to load employee rules.')),
      });
  }

  onEditEmployee(employee: AdminEmployeeItem, event?: Event): void {
    event?.stopPropagation();
    this.resetModalState();
    this.modalMode.set('edit');
    this.modalEmployee.set(employee);
    this.fullName.set(employee.employeeName ?? '');
    this.email.set(employee.email ?? '');
    this.phoneNumber.set(employee.phoneNumber ?? '');
  }

  onAddEmployee(): void {
    this.resetModalState();
    this.modalMode.set('add');
    this.loadRuleOptions();
  }

  closeModal(): void {
    if (!this.modalSubmitting()) this.modalMode.set(null);
  }

  submitEmployeeForm(): void {
    const mode = this.modalMode();
    if (!mode) return;
    this.submitAttempted.set(true);
    this.formError.set(null);

    const identityRequired = mode !== 'rights';
    if ((identityRequired && !this.hasValidIdentity()) || (mode !== 'edit' && (!this.hasValidRules() || this.rulesLoading() || this.employeeRightsLoading() || !!this.rulesError() || !!this.employeeRightsError()))) {
      this.formError.set('Complete the required fields and assign at least one module and work allocation.');
      return;
    }

    this.modalSubmitting.set(true);
    if (mode === 'edit') this.submitEmployeeUpdate();
    else if (mode === 'add') this.submitEmployeeCreate();
    else this.submitRulesUpdate();
  }

  toggleModulePermission(moduleName: string, checked: boolean): void {
    this.modulePermissions.update((current) => checked
      ? [...new Set([...current, moduleName])]
      : current.filter((module) => module !== moduleName));
  }

  toggleInsuranceType(insuranceTypeId: string, checked: boolean): void {
    this.selectedInsuranceTypeIds.update((current) => checked
      ? [...new Set([...current, insuranceTypeId])]
      : current.filter((id) => id !== insuranceTypeId));
    if (!checked) {
      this.selectedVehicleTypeIds.update((current) => {
        const next = { ...current };
        delete next[insuranceTypeId];
        return next;
      });
    }
  }

  toggleVehicleType(insuranceTypeId: string, vehicleTypeId: string, checked: boolean): void {
    this.selectedVehicleTypeIds.update((current) => {
      const selected = current[insuranceTypeId] ?? [];
      return {
        ...current,
        [insuranceTypeId]: checked
          ? [...new Set([...selected, vehicleTypeId])]
          : selected.filter((id) => id !== vehicleTypeId),
      };
    });
  }

  isModuleSelected(moduleName: string): boolean {
    return this.modulePermissions().includes(moduleName);
  }

  isInsuranceTypeSelected(insuranceTypeId: string): boolean {
    return this.selectedInsuranceTypeIds().includes(insuranceTypeId);
  }

  isVehicleTypeSelected(insuranceTypeId: string, vehicleTypeId: string): boolean {
    return (this.selectedVehicleTypeIds()[insuranceTypeId] ?? []).includes(vehicleTypeId);
  }

  isVehicleInsurance(insuranceTypeId: string): boolean {
    return this.insuranceTypes().find((type) => type.id === insuranceTypeId)?.name.trim().toLowerCase() === 'vehicle insurance';
  }

  getUserName(item: AdminEmployeeItem): string {
    if (item.userName?.trim()) return item.userName;
    if (item.email?.includes('@')) return item.email.split('@')[0];
    return item.employeeName || '—';
  }

  formatRole(role?: string): string {
    if (!role) return 'Employee';
    return role.replace(/([A-Z])/g, ' $1').trim();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  copyToClipboard(text: string, label: string): void {
    if (!text || text === '—') return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.setCopiedFeedback(text, label),
        () => this.fallbackCopy(text, label)
      );
    } else this.fallbackCopy(text, label);
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) this.toastMessage.set(null);
    }, 3500);
  }

  clearToast(): void {
    this.toastMessage.set(null);
  }

  loadRuleOptions(): void {
    this.rulesLoading.set(true);
    this.rulesError.set(null);
    forkJoin({
      insurance: this.enquiryService.getInsuranceTypes(),
      vehicles: this.enquiryService.getVehicleTypes(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.rulesLoading.set(false)))
      .subscribe({
        next: ({ insurance, vehicles }) => {
          if (!insurance.isSuccess || !vehicles.isSuccess) {
            this.rulesError.set(insurance.message || vehicles.message || 'Unable to load rule options.');
            return;
          }
          this.insuranceTypes.set(insurance.data ?? []);
          this.vehicleTypes.set(vehicles.data ?? []);
        },
        error: (error) => this.rulesError.set(this.getErrorMessage(error, 'Unable to load rule options.')),
      });
  }

  private submitEmployeeCreate(): void {
    const payload: CreateInternalUserPayload = {
      UserName: this.userName().trim(),
      FullName: this.fullName().trim(),
      Email: this.email().trim(),
      PhoneNumber: this.phoneNumber().trim(),
      Password: this.password(),
      UserType: this.userType(),
      ModulePermissions: [...this.modulePermissions()],
      WorkAllocations: this.buildWorkAllocations(),
    };
    this.employeeService.createInternalUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.modalSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.formError.set(response.message || 'Unable to add employee.');
            return;
          }
          this.modalMode.set(null);
          this.showToast(response.message || 'Employee added successfully.', 'success');
          this.loadEmployees();
        },
        error: (error) => this.formError.set(this.getErrorMessage(error, 'Unable to add employee.')),
      });
  }

  private submitEmployeeUpdate(): void {
    const employee = this.modalEmployee();
    if (!employee) {
      this.modalSubmitting.set(false);
      return;
    }
    const payload: UpdateEmployeePayload = {
      UserId: employee.id,
      FullName: this.fullName().trim(),
      Email: this.email().trim(),
      PhoneNumber: this.phoneNumber().trim(),
    };
    this.employeeService.updateEmployee(payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.modalSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.formError.set(response.message || 'Unable to update employee.');
            return;
          }
          this.modalMode.set(null);
          this.showToast(response.message || 'Employee updated successfully.', 'success');
          this.loadEmployees();
        },
        error: (error) => this.formError.set(this.getErrorMessage(error, 'Unable to update employee.')),
      });
  }

  private submitRulesUpdate(): void {
    const employee = this.modalEmployee();
    if (!employee) {
      this.modalSubmitting.set(false);
      return;
    }
    const payload: UpdateEmployeeRightsPayload = {
      UserId: employee.id,
      ModulePermissions: [...this.modulePermissions()],
      WorkAllocations: this.buildWorkAllocations(),
    };
    this.employeeService.updateEmployeeRights(payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.modalSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.formError.set(response.message || 'Unable to update employee rules.');
            return;
          }
          this.modalMode.set(null);
          this.showToast(response.message || 'Employee rules updated successfully.', 'success');
        },
        error: (error) => this.formError.set(this.getErrorMessage(error, 'Unable to update employee rules.')),
      });
  }

  private buildWorkAllocations(): WorkAllocationPayload[] {
    return this.selectedInsuranceTypeIds().map((insuranceTypeId) => ({
      InsuranceTypeId: insuranceTypeId,
      VehicleTypeIds: this.isVehicleInsurance(insuranceTypeId)
        ? [...(this.selectedVehicleTypeIds()[insuranceTypeId] ?? [])]
        : [],
    }));
  }

  private resetModalState(): void {
    this.modalEmployee.set(null);
    this.modalSubmitting.set(false);
    this.rulesLoading.set(false);
    this.employeeRightsLoading.set(false);
    this.rulesError.set(null);
    this.employeeRightsError.set(null);
    this.formError.set(null);
    this.submitAttempted.set(false);
    this.fullName.set('');
    this.userName.set('');
    this.email.set('');
    this.phoneNumber.set('');
    this.password.set('');
    this.userType.set('AdminEmployee');
    this.modulePermissions.set([]);
    this.selectedInsuranceTypeIds.set([]);
    this.selectedVehicleTypeIds.set({});
  }

  private revertEmployeeStatus(employeeId: string, status: boolean): void {
    this.employees.update((items) => items.map((item) => item.id === employeeId ? { ...item, status } : item));
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.errors?.[0] || fallback;
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
      if (this.copiedField() === text) this.copiedField.set(null);
    }, 2000);
  }
}
