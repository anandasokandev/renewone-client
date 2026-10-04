import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { StaffService } from '../../services/staff/staff.service';
import { StaffItem } from '../../models/staff.model';
import { EnquiryService, PROGRESSIVE_STATUS_SEQUENCE, STATUS_SEQUENCE } from '../../services/enquiry/enquiry.service';
import {
  EnquiryDataResponse,
  EnquiryFilterParams,
  EnquiryItem,
  EnquiryMetrics,
  EnquiryPagedResult,
  EnquiryStatus,
  EnquiryStatusEnum,
  InsuranceTypeItem,
  STATUS_OPTIONS,
  StatusOption,
  UserRole,
  VehicleTypeItem,
} from '../../models/enquiry.model';
import { InsuranceProducts } from '../insurance-products/insurance-products';
import { Policy } from '../policy/policy';
import { EnquiryDetails } from '../enquiry-details/enquiry-details';
import { DashboardProduct } from '../../models/dashboard.model';

@Component({
  selector: 'app-enquiry',
  standalone: true,
  imports: [CommonModule, FormsModule, InsuranceProducts, Policy, EnquiryDetails],
  templateUrl: './enquiry.html',
  styleUrl: './enquiry.css',
})
export class Enquiry implements OnInit {
  private enquiryService = inject(EnquiryService);
  private staffService = inject(StaffService);
  private authService = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchSubject = new Subject<string>();

  // Status lifecycle options and sequences
  readonly statusSequence: EnquiryStatus[] = STATUS_SEQUENCE;
  readonly progressiveSequence: EnquiryStatus[] = PROGRESSIVE_STATUS_SEQUENCE;
  readonly statusOptions: StatusOption[] = STATUS_OPTIONS;
  readonly staffMembers = signal<StaffItem[]>([]);
  staffList: string[] = [];

  // Dynamic Insurance Types fetched from /api/insurance-types
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly isInsuranceTypesLoading = signal<boolean>(false);

  // Dynamic Vehicle Types fetched from /api/vehicle-types
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);
  readonly isVehicleTypesLoading = signal<boolean>(false);

  // Active Role State (Agency Owner: 'Agent' | Staff: 'Staff')
  readonly activeRole = signal<UserRole>(
    (this.authService.currentUser()?.userType as UserRole)
  );
  readonly isAgent = computed(() =>
    this.authService.isAgent() ||
    this.activeRole()?.trim().toLowerCase() === 'agent' ||
    (this.authService.currentUser() as any)?.role?.trim().toLowerCase() === 'agent'
  );

  // API Results & Pagination State
  readonly enquiries = signal<EnquiryItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly hasPreviousPage = signal<boolean>(false);
  readonly hasNextPage = signal<boolean>(false);
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Filter States
  readonly searchQuery = signal<string>('');
  readonly selectedInsuranceTypeId = signal<string>('All');
  readonly selectedInsuranceType = computed(() =>
    this.insuranceTypes().find(t => t.id === this.selectedInsuranceTypeId())
  );
  readonly isVehicleInsuranceSelected = computed(() =>
    this.selectedInsuranceType()?.name?.trim().toLowerCase() === 'vehicle insurance'
  );
  readonly selectedVehicleTypeId = signal<string>('All');
  readonly selectedStatusFilter = signal<string>('All');
  readonly selectedAgentId = signal<string>('All');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // UI Drawer & Modal States
  readonly isProductsModalOpen = signal<boolean>(false);
  readonly isPolicyModalOpen = signal<boolean>(false);
  readonly selectedPolicyEnquiryId = signal<string>('');
  readonly selectedPolicyEnquiryNumber = signal<string>('');
  readonly selectedEnquiry = signal<EnquiryItem | null>(null);
  readonly statusUpdateNotice = signal<string | null>(null);

  // Real-time backend KPI metrics
  readonly metrics = signal<EnquiryMetrics>({
    allEnquiries: 0,
    created: 0,
    submitted: 0,
    quoted: 0,
    policyIssued: 0,
    pointsEarned: 0,
  });

  // Computed KPI counts for quick metrics strip
  readonly totalCount = computed(() => this.metrics().allEnquiries ?? this.totalRecords());
  readonly createdCount = computed(() => this.metrics().created ?? 0);
  readonly submittedCount = computed(() => this.metrics().submitted ?? 0);
  readonly quotedCount = computed(() => this.metrics().quoted ?? 0);
  readonly policyIssuedCount = computed(() => this.metrics().policyIssued ?? 0);
  readonly pointsEarned = computed(() => this.metrics().pointsEarned ?? 0);
  readonly cancelledCount = computed(() =>
    this.enquiries().filter(e => e.status === 'Cancelled' || (e.status as any) === 8).length
  );

  // Helper Functions for Status metadata & labels
  getStatusOption(status: EnquiryStatus | number | string): StatusOption | undefined {
    return this.statusOptions.find(
      s =>
        s.key === status ||
        s.id === status ||
        String(s.id) === String(status) ||
        s.key.toLowerCase() === String(status).toLowerCase()
    );
  }

  getStatusLabel(status: EnquiryStatus | number | string): string {
    const opt = this.getStatusOption(status);
    return opt ? opt.label : String(status);
  }

  isCancelled(status: EnquiryStatus | number | string): boolean {
    return status === 'Cancelled' || (status as any) === 8 || String(status).toLowerCase() === 'cancelled';
  }

  isIssued(status: EnquiryStatus | number | string): boolean {
    return (
      status === 'PolicyIssued' ||
      (status as any) === 7 ||
      status === 'Issued' ||
      String(status).toLowerCase() === 'policyissued'
    );
  }

  getStatusStageIndex(status: EnquiryStatus | number | string): number {
    const opt = this.getStatusOption(status);
    if (!opt) return 0;
    return this.progressiveSequence.indexOf(opt.key);
  }

  getProgressPercentage(status: EnquiryStatus | number | string): number {
    if (this.isCancelled(status)) return 0;
    const opt = this.getStatusOption(status);
    if (!opt) return 0;
    const idx = this.progressiveSequence.indexOf(opt.key);
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / this.progressiveSequence.length) * 100);
  }

  getStepShortLabel(stage: EnquiryStatus): string {
    switch (stage) {
      case 'Created':
        return 'Created';
      case 'Submitted':
        return 'Submitted';
      case 'QuoteInProgress':
        return 'Quote Prep';
      case 'Quoted':
        return 'Quoted';
      case 'PaymentVerificationPending':
        return 'Payment';
      case 'PolicyInProgress':
        return 'Policy Prep';
      case 'PolicyIssued':
        return 'Issued';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return stage;
    }
  }

  isStageCompletedOrCurrent(currentStatus: EnquiryStatus | number | string, stageIndex: number): boolean {
    if (this.isCancelled(currentStatus)) return false;
    return this.getStatusStageIndex(currentStatus) >= stageIndex;
  }

  isStageCurrent(currentStatus: EnquiryStatus | number | string, stageIndex: number): boolean {
    if (this.isCancelled(currentStatus)) return false;
    return this.getStatusStageIndex(currentStatus) === stageIndex;
  }

  ngOnInit(): void {
    this.loadStaff();
    this.loadInsuranceTypes();
    this.loadVehicleTypes();

    this.route.queryParams.subscribe(params => {
      if (params['insuranceTypeId']) {
        this.selectedInsuranceTypeId.set(params['insuranceTypeId']);
      }
      if (params['vehicleTypeId']) {
        this.selectedVehicleTypeId.set(params['vehicleTypeId']);
      }
      if (params['agentId']) {
        this.selectedAgentId.set(params['agentId']);
      }
      this.loadEnquiries();
    });

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.pageNumber.set(1);
        this.loadEnquiries();
      });
  }

  loadEnquiries(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params: EnquiryFilterParams = {
      search: this.searchQuery()?.trim() || undefined,
      insuranceTypeId: this.selectedInsuranceTypeId() !== 'All' ? this.selectedInsuranceTypeId() : undefined,
      vehicleTypeId:
        this.isVehicleInsuranceSelected() && this.selectedVehicleTypeId() !== 'All'
          ? this.selectedVehicleTypeId()
          : undefined,
      enquiryStatus: this.selectedStatusFilter() !== 'All' ? this.selectedStatusFilter() : undefined,
      agentId: this.selectedAgentId() !== 'All' ? this.selectedAgentId() : undefined,
      sortDirection: this.sortDirection(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
    };

    this.enquiryService.getAgentEnquiries(params).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.isSuccess && res.data) {
          const dataObj = res.data;
          const pagedData: EnquiryPagedResult = (dataObj as any).enquiries || (dataObj as any);
          const metricsData: EnquiryMetrics = (dataObj as any).metrics || {
            allEnquiries: pagedData.totalRecords || 0,
            created: 0,
            submitted: 0,
            quoted: 0,
            policyIssued: 0,
            pointsEarned: 0,
          };

          this.metrics.set(metricsData);

          const rawItems = pagedData.items || [];
          const mappedItems: EnquiryItem[] = rawItems.map(item => {
            const agentPhone =
              (item as any).assigedAgentNumber ||
              (item as any).assignedAgentNumber ||
              '';
            return {
              ...item,
              id: item.enquiryId,
              enquiryNumber: item.enquiryNumber || (item as any).enquiryNumber || item.enquiryId,
              customerPhone: item.phoneNumber || item.customerPhone || '',
              assignedStaff: item.assignedAgentName || item.agentName || item.assignedStaff || 'Unassigned',
              assigedAgentNumber: agentPhone,
              assignedAgentNumber: agentPhone,
            };
          });
          this.enquiries.set(mappedItems);
          this.pageNumber.set(pagedData.pageNumber || 1);
          this.pageSize.set(pagedData.pageSize || 10);
          this.totalRecords.set(pagedData.totalRecords ?? mappedItems.length);
          this.totalPages.set(pagedData.totalPages || 1);
          this.hasPreviousPage.set(pagedData.hasPreviousPage ?? (this.pageNumber() > 1));
          this.hasNextPage.set(pagedData.hasNextPage ?? (this.pageNumber() < this.totalPages()));
        } else {
          this.enquiries.set([]);
          this.totalRecords.set(0);
          this.totalPages.set(1);
          this.hasPreviousPage.set(false);
          this.hasNextPage.set(false);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load enquiries from /api/Enquiry/agent/enquiries:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to load enquiries from server.');
        this.enquiries.set([]);
        this.totalRecords.set(0);
        this.totalPages.set(1);
        this.hasPreviousPage.set(false);
        this.hasNextPage.set(false);
      },
    });
  }

  // Role Switcher for Testing / Permissions demo
  setRole(role: UserRole): void {
    this.activeRole.set(role);
  }

  // Status Action Handlers
  advanceStatus(event: Event, enquiry: EnquiryItem): void {
    event.stopPropagation();
    const nextStatus = this.enquiryService.advanceStatus(enquiry.enquiryId || enquiry.id || '');
    if (nextStatus) {
      this.showNotice(`Enquiry ${enquiry.enquiryId} advanced to ${this.getStatusLabel(nextStatus)}`);
      this.enquiries.update(list =>
        list.map(e => (e.enquiryId === enquiry.enquiryId ? { ...e, status: nextStatus } : e))
      );
      if (this.selectedEnquiry()?.enquiryId === enquiry.enquiryId) {
        this.selectedEnquiry.set({ ...this.selectedEnquiry()!, status: nextStatus });
      }
    }
  }

  updateEnquiryStatus(enquiryId: string, status: EnquiryStatus): void {
    this.enquiryService.updateStatus(enquiryId, status);
    this.showNotice(`Status updated to "${this.getStatusLabel(status)}"`);
    this.enquiries.update(list =>
      list.map(e => (e.enquiryId === enquiryId ? { ...e, status } : e))
    );
    if (this.selectedEnquiry()?.enquiryId === enquiryId) {
      this.selectedEnquiry.set({ ...this.selectedEnquiry()!, status });
    }
  }

  assignStaff(event: Event, enquiry: EnquiryItem, staffName: string): void {
    event.stopPropagation();
    this.enquiryService.assignStaff(enquiry.enquiryId || enquiry.id || '', staffName);
    this.showNotice(`${enquiry.enquiryId} assigned to ${staffName}`);
    if (this.selectedEnquiry()?.enquiryId === enquiry.enquiryId) {
      this.selectedEnquiry.set({ ...this.selectedEnquiry()!, assignedStaff: staffName });
    }
  }

  navigateToQuotes(enquiry: EnquiryItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const id = enquiry.enquiryId || enquiry.id || '';
    this.router.navigate(['/quote'], {
      queryParams: {
        enquiryId: id,
        status: 'Quoted',
      },
    });
  }

  openPolicyModal(enquiry: EnquiryItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const id = enquiry.enquiryId || enquiry.id || '';
    this.selectedPolicyEnquiryId.set(id);
    this.selectedPolicyEnquiryNumber.set(enquiry.enquiryNumber || enquiry.enquiryId || '');
    this.isPolicyModalOpen.set(true);
  }

  closePolicyModal(): void {
    this.isPolicyModalOpen.set(false);
    this.selectedPolicyEnquiryId.set('');
    this.selectedPolicyEnquiryNumber.set('');
  }

  // Filter Quick Actions
  setStatusFilter(status: string): void {
    this.selectedStatusFilter.set(status);
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  setTypeFilter(typeId: string): void {
    this.selectedInsuranceTypeId.set(typeId);
    this.selectedVehicleTypeId.set('All');
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  setVehicleTypeFilter(vtId: string): void {
    this.selectedVehicleTypeId.set(vtId);
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  setStaffFilter(agentId: string): void {
    this.selectedAgentId.set(agentId);
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  setSortDirection(dir: 'asc' | 'desc'): void {
    this.sortDirection.set(dir);
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  onSearchInput(term: string): void {
    this.searchQuery.set(term);
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.pageNumber()) {
      this.pageNumber.set(page);
      this.loadEnquiries();
    }
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.pageNumber.update(p => p - 1);
      this.loadEnquiries();
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.pageNumber.update(p => p + 1);
      this.loadEnquiries();
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedInsuranceTypeId.set('All');
    this.selectedVehicleTypeId.set('All');
    this.selectedStatusFilter.set('All');
    this.selectedAgentId.set('All');
    this.sortDirection.set('desc');
    this.pageNumber.set(1);
    this.loadEnquiries();
  }

  loadInsuranceTypes(): void {
    this.isInsuranceTypesLoading.set(true);
    this.enquiryService.getInsuranceTypes().subscribe({
      next: (res) => {
        this.isInsuranceTypesLoading.set(false);
        if (res && res.isSuccess && Array.isArray(res.data)) {
          // only show isActive == true records, sorted by displayOrder
          const activeList = res.data
            .filter((item) => item.isActive === true)
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          this.insuranceTypes.set(activeList);
        }
      },
      error: (err) => {
        this.isInsuranceTypesLoading.set(false);
        console.error('Failed to load insurance types from /api/insurance-types:', err);
      },
    });
  }

  loadVehicleTypes(): void {
    this.isVehicleTypesLoading.set(true);
    this.enquiryService.getVehicleTypes().subscribe({
      next: (res) => {
        this.isVehicleTypesLoading.set(false);
        if (res && res.isSuccess && Array.isArray(res.data)) {
          // only show isActive == true records
          const activeList = res.data.filter((item) => item.isActive === true);
          this.vehicleTypes.set(activeList);
        }
      },
      error: (err) => {
        this.isVehicleTypesLoading.set(false);
        console.error('Failed to load vehicle types from /api/vehicle-types:', err);
      },
    });
  }

  private getAccountId(): string | null {
    const stored = sessionStorage.getItem('accountId');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'string') return parsed;
        if (parsed?.id) return parsed.id;
        return String(parsed);
      } catch {
        return stored;
      }
    }
    return (this.authService.currentUser() as any)?.accountId || null;
  }

  loadStaff(): void {
    const accountId = this.getAccountId();
    if (accountId) {
      this.staffService.getStaffList(accountId, { pageSize: 100, status: true }).subscribe({
        next: (res) => {
          if (res && res.isSuccess && res.data) {
            const items = res.data.staff?.items || res.data.items || [];
            this.staffMembers.set(items);
            this.staffList = items
              .map(s => s.fullName || s.userName)
              .filter(Boolean);
          }
        },
        error: () => {
          this.staffMembers.set([]);
          this.staffList = [];
        },
      });
    } else {
      this.staffMembers.set([]);
      this.staffList = [];
    }
  }

  // Drawer / Detail View
  openDetailDrawer(enquiry: EnquiryItem): void {
    this.selectedEnquiry.set(enquiry);
  }

  closeDetailDrawer(): void {
    this.selectedEnquiry.set(null);
  }

  // Insurance Product Selection Modal
  openProductsModal(): void {
    this.isProductsModalOpen.set(true);
  }

  closeProductsModal(): void {
    this.isProductsModalOpen.set(false);
  }

  openManualCreateModal(): void {
    this.closeProductsModal();
    this.router.navigate(['/enquiry/create-enquiry']);
  }

  onProductSelectedFromModal(product: DashboardProduct): void {
    this.closeProductsModal();
    const typeParam = (product.insuranceTypeName || product.name || '').trim();
    const queryParams: Record<string, string> = {
      type: typeParam,
    };

    if (product.insuranceTypeId) {
      queryParams['insuranceTypeId'] = product.insuranceTypeId;
    }

    const isVehicleInsurance =
      typeParam.toLowerCase() === 'vehicle insurance' ||
      (product.insuranceTypeName || '').trim().toLowerCase() === 'vehicle insurance';

    if (isVehicleInsurance && product.vehicleTypeId) {
      queryParams['vehicleTypeId'] = product.vehicleTypeId;
    }

    this.router.navigate(['/enquiry/create-enquiry'], {
      queryParams,
    });
  }


  // Check if assigned agent is present and not unassigned/null
  hasAssignedAgent(enquiry: EnquiryItem | null): boolean {
    if (!enquiry) return false;
    const name = (enquiry.assignedAgentName || enquiry.assignedStaff || '').trim();
    if (!name || name.toLowerCase() === 'unassigned' || name.toLowerCase() === 'null') {
      return !!(enquiry.assignedAgentId || enquiry.assigedAgentNumber || enquiry.assignedAgentNumber);
    }
    return true;
  }

  // WhatsApp Web Integration
  openWhatsApp(enquiry: EnquiryItem, event: Event): void {
    if (!this.hasAssignedAgent(enquiry)) return;
    event.stopPropagation();

    const enquiryNumber = enquiry.enquiryNumber || enquiry.enquiryId || '';
    const agentName = enquiry.assignedAgentName || enquiry.assignedStaff || enquiry.agentName || 'Unassigned';
    const enquiryStatus = this.getStatusLabel(enquiry.status);

    // Extract creator details from enquiry or fallback to current user session
    const createdAgent =
      (enquiry as any).createdAgentName ||
      (enquiry as any).createdAgent ||
      (enquiry as any).createdByName ||
      (enquiry as any).creatorName ||
      this.authService.currentUser()?.fullName ||
      '';

    let storedPhone = '';
    try {
      const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      storedPhone =
        storedUser.phone ||
        storedUser.phoneNumber ||
        storedUser.mobile ||
        storedUser.contactNumber ||
        '';
    } catch {
      storedPhone = '';
    }

    const createdNumber =
      (enquiry as any).createdAgentNumber ||
      (enquiry as any).createdByNumber ||
      (enquiry as any).creatorPhone ||
      (enquiry as any).creatorNumber ||
      storedPhone ||
      '';

    let createdAgentAndNumber = (enquiry as any).createdAgentAndNumber || '';
    if (!createdAgentAndNumber) {
      createdAgentAndNumber = [createdAgent, createdNumber].filter(Boolean).join(', ');
    }

    const message = [
      `Enquiry Regarding ${enquiryNumber}`,
      `Agent Name - ${agentName}`,
      `Created Agent & Number - ${createdAgentAndNumber}`,
      `Enquiry Status - ${enquiryStatus}`,
    ].join('\n');

    const agentPhone = enquiry.assigedAgentNumber || enquiry.assignedAgentNumber || '';
    let cleanPhone = agentPhone.toString().replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const whatsappUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  // Copy helper
  copyToClipboard(text: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard?.writeText(text);
    this.showNotice(`Copied: ${text}`);
  }

  // Export CSV (Agency Owner 'Agent' feature)
  exportCsv(): void {
    const list = this.enquiries();
    if (list.length === 0) return;

    const headers = ['Enquiry ID / No', 'Customer Name', 'Phone', 'Email', 'Insurance Type', 'Status', 'Assigned Staff', 'Created At'];
    const rows = list.map(e => [
      e.enquiryNumber || e.enquiryId,
      `"${e.customerName}"`,
      `"${e.phoneNumber || e.customerPhone || ''}"`,
      `"${e.customerEmail || ''}"`,
      `"${e.insuranceType}"`,
      e.status,
      `"${e.assignedStaff || e.assignedAgentName || ''}"`,
      new Date(e.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RenewOne_Enquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotice('Enquiries exported to CSV successfully');
  }

  private showNotice(msg: string): void {
    this.statusUpdateNotice.set(msg);
    setTimeout(() => {
      if (this.statusUpdateNotice() === msg) {
        this.statusUpdateNotice.set(null);
      }
    }, 3500);
  }
}
