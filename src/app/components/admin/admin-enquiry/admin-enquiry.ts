import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { AccountService } from '../../../services/account/account.service';
import { AgentListItem } from '../../../models/account.model';
import {
  AdminAllEnquiriesFilterParams,
  AdminAllEnquiryItem,
  AdminCommonQueueFilterParams,
  AdminCommonQueueItem,
  AdminMyTaskItem,
  AdminMyTasksFilterParams,
  AdminPolicyQueueFilterParams,
  AdminPolicyQueueItem,
  AdminQuoteQueueFilterParams,
  AdminQuoteQueueItem,
  DateFilterType,
  EnquiryItem,
  InsuranceTypeItem,
  POLICY_TYPE_OPTIONS,
  PolicyTypeOption,
  PolicyQueueType,
  QuoteQueueType,
  SortDirectionEnum,
  STATUS_OPTIONS,
  StatusOption,
  VehicleTypeItem,
} from '../../../models/enquiry.model';
import { EnquiryDetails } from '../../enquiry-details/enquiry-details';

export interface EnquiryStageTab {
  id: number;
  key: string;
  label: string;
  description: string;
  badge?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-enquiry',
  imports: [CommonModule, FormsModule, RouterModule, EnquiryDetails],
  templateUrl: './admin-enquiry.html',
  styleUrl: './admin-enquiry.css',
})
export class AdminEnquiry implements OnInit {
  private readonly enquiryService = inject(EnquiryService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Workflow Stages (7 Stages Architecture)
  readonly activeStage = signal<number>(1);
  readonly stages: EnquiryStageTab[] = [
    { id: 1, key: 'queue', label: 'Enquiry Queue', description: '', isActive: true },
    { id: 2, key: 'all-enquiries', label: 'All Enquiries', description: '', isActive: false },
    { id: 3, key: 'my-task', label: 'My Task', description: '', isActive: false },
    { id: 4, key: 'quote', label: 'Quote', description: '', isActive: false },
    { id: 5, key: 'quoted', label: 'Quoted', description: '', isActive: false },
    { id: 6, key: 'policy', label: 'Policy', description: '', isActive: false },
    { id: 7, key: 'policy-issued', label: 'Policy Issued', description: '', isActive: false },
  ];

  // Common Queue Data State (Tab 1)
  readonly queueItems = signal<AdminCommonQueueItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(4);
  readonly hasPreviousPage = signal<boolean>(false);
  readonly hasNextPage = signal<boolean>(false);

  // Common Queue Filter States
  readonly DateFilterType = DateFilterType;
  readonly searchQuery = signal<string>('');
  readonly selectedInsuranceTypeId = signal<string>('All');
  readonly selectedVehicleTypeId = signal<string>('All');
  readonly selectedDateFilter = signal<number>(DateFilterType.Today);
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly sortDescending = signal<boolean>(true);

  // Lookups & Options
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);
  readonly statusOptions: StatusOption[] = STATUS_OPTIONS;
  readonly accountOptions = signal<AgentListItem[]>([]);

  // All Enquiries Data State (Tab 2)
  readonly allEnquiriesItems = signal<AdminAllEnquiryItem[]>([]);
  readonly isAllEnquiriesLoading = signal<boolean>(false);
  readonly allEnquiriesTotalRecords = signal<number>(0);
  readonly allEnquiriesTotalPages = signal<number>(1);
  readonly allEnquiriesPageNumber = signal<number>(1);
  readonly allEnquiriesPageSize = signal<number>(4);
  readonly allEnquiriesHasPreviousPage = signal<boolean>(false);
  readonly allEnquiriesHasNextPage = signal<boolean>(false);

  // All Enquiries Filter States
  readonly allEnquiriesSearchQuery = signal<string>('');
  readonly allEnquiriesSelectedStatus = signal<number | 'All'>('All');
  readonly allEnquiriesSelectedInsuranceTypeId = signal<string>('All');
  readonly allEnquiriesSelectedVehicleTypeId = signal<string>('All');
  readonly allEnquiriesSelectedAccountId = signal<string>('All');
  readonly allEnquiriesSelectedDateFilter = signal<number>(DateFilterType.Today);
  readonly allEnquiriesFromDate = signal<string>('');
  readonly allEnquiriesToDate = signal<string>('');
  readonly allEnquiriesSortDescending = signal<boolean>(true);

  // My Tasks Data State (Tab 3)
  readonly myTasksItems = signal<AdminMyTaskItem[]>([]);
  readonly isMyTasksLoading = signal<boolean>(false);
  readonly myTasksTotalRecords = signal<number>(0);
  readonly myTasksTotalPages = signal<number>(1);
  readonly myTasksPageNumber = signal<number>(1);
  readonly myTasksPageSize = signal<number>(10);
  readonly myTasksHasPreviousPage = signal<boolean>(false);
  readonly myTasksHasNextPage = signal<boolean>(false);

  // My Tasks Filter States
  readonly myTasksSearchQuery = signal<string>('');
  readonly myTasksSelectedInsuranceTypeId = signal<string>('All');
  readonly myTasksSelectedVehicleTypeId = signal<string>('All');
  readonly myTasksSelectedPolicyType = signal<number | 'All'>('All');
  readonly myTasksSelectedEnquiryStatus = signal<number | 'All'>('All');
  readonly myTasksSelectedAccountId = signal<string>('All');
  readonly myTasksSelectedDateFilter = signal<number>(DateFilterType.Today);
  readonly myTasksFromDate = signal<string>('');
  readonly myTasksToDate = signal<string>('');
  readonly myTasksSortBy = signal<number | undefined>(undefined);
  readonly myTasksSortDirection = signal<number>(SortDirectionEnum.Descending);

  // Quote & Quoted Queue Data State (Tabs 4 & 5)
  readonly quoteQueueItems = signal<AdminQuoteQueueItem[]>([]);
  readonly isQuoteQueueLoading = signal<boolean>(false);
  readonly quoteTotalRecords = signal<number>(0);
  readonly quotedTotalRecords = signal<number>(0);
  readonly quoteQueueTotalPages = signal<number>(1);
  readonly quoteQueuePageNumber = signal<number>(1);
  readonly quoteQueuePageSize = signal<number>(10);
  readonly quoteQueueHasPreviousPage = signal<boolean>(false);
  readonly quoteQueueHasNextPage = signal<boolean>(false);

  // Quote & Quoted Queue Filter States
  readonly quoteQueueSearchQuery = signal<string>('');
  readonly quoteQueueSelectedInsuranceTypeId = signal<string>('All');
  readonly quoteQueueSelectedVehicleTypeId = signal<string>('All');
  readonly quoteQueueSelectedAccountId = signal<string>('All');
  readonly quoteQueueSelectedDateFilter = signal<number>(DateFilterType.Today);
  readonly quoteQueueFromDate = signal<string>('');
  readonly quoteQueueToDate = signal<string>('');
  readonly quoteQueueSortDescending = signal<boolean>(true);

  // Policy & Policy Issued Queue Data State (Tabs 6 & 7)
  readonly policyQueueItems = signal<AdminPolicyQueueItem[]>([]);
  readonly isPolicyQueueLoading = signal<boolean>(false);
  readonly policyTotalRecords = signal<number>(0);
  readonly policyIssuedTotalRecords = signal<number>(0);
  readonly policyQueueTotalPages = signal<number>(1);
  readonly policyQueuePageNumber = signal<number>(1);
  readonly policyQueuePageSize = signal<number>(10);
  readonly policyQueueHasPreviousPage = signal<boolean>(false);
  readonly policyQueueHasNextPage = signal<boolean>(false);

  // Policy & Policy Issued Queue Filter States
  readonly policyQueueSearchQuery = signal<string>('');
  readonly policyQueueSelectedStatus = signal<number | 'All'>('All');
  readonly policyQueueSelectedInsuranceTypeId = signal<string>('All');
  readonly policyQueueSelectedVehicleTypeId = signal<string>('All');
  readonly policyQueueSelectedAccountId = signal<string>('All');
  readonly policyQueueSelectedDateFilter = signal<number>(DateFilterType.Today);
  readonly policyQueueFromDate = signal<string>('');
  readonly policyQueueToDate = signal<string>('');
  readonly policyQueueSortDescending = signal<boolean>(true);

  readonly policyTypeOptions: PolicyTypeOption[] = POLICY_TYPE_OPTIONS;

  // Toast & Feedback
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('info');
  readonly copiedField = signal<string | null>(null);

  // Detail Modal / Drawer state
  readonly selectedEnquiry = signal<EnquiryItem | null>(null);

  // Active Stage Object helper
  readonly activeStageObj = computed(() =>
    this.stages.find((s) => s.id === this.activeStage())
  );

  // Computed summaries
  readonly urgentCount = computed(() =>
    this.queueItems().filter((item) => item.priority === 2).length
  );
  readonly highPriorityCount = computed(() =>
    this.queueItems().filter((item) => item.priority === 1).length
  );
  readonly normalPriorityCount = computed(() =>
    this.queueItems().filter((item) => item.priority === 0).length
  );

  readonly showingRangeText = computed<string>(() => {
    const total = this.totalRecords();
    if (total === 0) return '0 - 0 of 0 enquiries';
    const start = (this.pageNumber() - 1) * this.pageSize() + 1;
    const end = Math.min(this.pageNumber() * this.pageSize(), total);
    return `${start} - ${end} of ${total} enquiries`;
  });

  readonly allEnquiriesShowingRangeText = computed<string>(() => {
    const total = this.allEnquiriesTotalRecords();
    if (total === 0) return '0 - 0 of 0 enquiries';
    const start = (this.allEnquiriesPageNumber() - 1) * this.allEnquiriesPageSize() + 1;
    const end = Math.min(this.allEnquiriesPageNumber() * this.allEnquiriesPageSize(), total);
    return `${start} - ${end} of ${total} enquiries`;
  });

  readonly myTasksShowingRangeText = computed<string>(() => {
    const total = this.myTasksTotalRecords();
    if (total === 0) return '0 - 0 of 0 enquiries';
    const start = (this.myTasksPageNumber() - 1) * this.myTasksPageSize() + 1;
    const end = Math.min(this.myTasksPageNumber() * this.myTasksPageSize(), total);
    return `${start} - ${end} of ${total} enquiries`;
  });

  readonly quoteQueueTotalRecords = computed<number>(() => {
    return this.activeStage() === 4 ? this.quoteTotalRecords() : this.quotedTotalRecords();
  });

  readonly quoteQueueShowingRangeText = computed<string>(() => {
    const total = this.quoteQueueTotalRecords();
    if (total === 0) return '0 - 0 of 0 enquiries';
    const start = (this.quoteQueuePageNumber() - 1) * this.quoteQueuePageSize() + 1;
    const end = Math.min(this.quoteQueuePageNumber() * this.quoteQueuePageSize(), total);
    return `${start} - ${end} of ${total} enquiries`;
  });

  readonly policyQueueTotalRecords = computed<number>(() => {
    return this.activeStage() === 6 ? this.policyTotalRecords() : this.policyIssuedTotalRecords();
  });

  readonly policyQueueShowingRangeText = computed<string>(() => {
    const total = this.policyQueueTotalRecords();
    if (total === 0) return '0 - 0 of 0 enquiries';
    const start = (this.policyQueuePageNumber() - 1) * this.policyQueuePageSize() + 1;
    const end = Math.min(this.policyQueuePageNumber() * this.policyQueuePageSize(), total);
    return `${start} - ${end} of ${total} enquiries`;
  });

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadQueue();
    this.loadAllEnquiries();
    this.loadMyTasks();
    this.loadQuoteCounts();
    this.loadPolicyCounts();
  }

  loadQuoteCounts(): void {
    // Preload count for Quote tab (Stage 4, Type = 0)
    this.enquiryService
      .getAdminMyQuoteQueue({
        type: QuoteQueueType.Quote,
        dateFilter: DateFilterType.Today,
        pageNumber: 1,
        pageSize: 1,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.quoteTotalRecords.set(res.data.totalRecords ?? 0);
          }
        },
        error: () => {},
      });

    // Preload count for Quoted tab (Stage 5, Type = 1)
    this.enquiryService
      .getAdminMyQuoteQueue({
        type: QuoteQueueType.Quoted,
        dateFilter: DateFilterType.Today,
        pageNumber: 1,
        pageSize: 1,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.quotedTotalRecords.set(res.data.totalRecords ?? 0);
          }
        },
        error: () => {},
      });
  }

  loadPolicyCounts(): void {
    // Preload count for Policy tab (Stage 6, Type = 0)
    this.enquiryService
      .getAdminMyPolicyQueue({
        type: PolicyQueueType.Policy,
        dateFilter: DateFilterType.Today,
        pageNumber: 1,
        pageSize: 1,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.policyTotalRecords.set(res.data.totalRecords ?? 0);
          }
        },
        error: () => {},
      });

    // Preload count for Policy Issued tab (Stage 7, Type = 1)
    this.enquiryService
      .getAdminMyPolicyQueue({
        type: PolicyQueueType.PolicyIssued,
        dateFilter: DateFilterType.Today,
        pageNumber: 1,
        pageSize: 1,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.policyIssuedTotalRecords.set(res.data.totalRecords ?? 0);
          }
        },
        error: () => {},
      });
  }

  loadDropdownData(): void {
    this.accountService
      .getAgents({ pageNumber: 1, pageSize: 100, userType: 'Agent' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.agents?.items) {
            this.accountOptions.set(res.data.agents.items);
          }
        },
        error: () => {},
      });

    this.enquiryService
      .getInsuranceTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.insuranceTypes.set(res.data.filter((t) => t.isActive));
          }
        },
      });

    this.enquiryService
      .getVehicleTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.vehicleTypes.set(res.data.filter((v) => v.isActive));
          }
        },
      });
  }

  loadQueue(): void {
    this.isLoading.set(true);

    const params: AdminCommonQueueFilterParams = {
      search: this.searchQuery().trim() || undefined,
      insuranceTypeId:
        this.selectedInsuranceTypeId() !== 'All' ? this.selectedInsuranceTypeId() : undefined,
      vehicleTypeId:
        this.selectedVehicleTypeId() !== 'All' ? this.selectedVehicleTypeId() : undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      dateFilter: this.selectedDateFilter() ?? DateFilterType.Today,
      sortDescending: this.sortDescending(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
    };

    this.enquiryService
      .getAdminCommonQueue(params)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.queueItems.set(res.data.items || []);
            this.totalRecords.set(res.data.totalRecords ?? (res.data.items?.length || 0));
            this.totalPages.set(res.data.totalPages ?? 1);
            this.pageNumber.set(res.data.pageNumber ?? 1);
            this.pageSize.set(res.data.pageSize ?? 10);
            this.hasPreviousPage.set(
              res.data.hasPreviousPage ?? (this.pageNumber() > 1)
            );
            this.hasNextPage.set(
              res.data.hasNextPage ?? (this.pageNumber() < this.totalPages())
            );
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch common queue.', 'error');
        },
      });
  }

  refreshQueue(): void {
    if (this.activeStage() === 2) {
      this.loadAllEnquiries();
      this.showToast('All Enquiries refreshed.', 'info');
    } else if (this.activeStage() === 3) {
      this.loadMyTasks();
      this.showToast('My Tasks refreshed.', 'info');
    } else if (this.activeStage() === 4) {
      this.loadQuoteQueue(QuoteQueueType.Quote);
      this.showToast('Quote queue refreshed.', 'info');
    } else if (this.activeStage() === 5) {
      this.loadQuoteQueue(QuoteQueueType.Quoted);
      this.showToast('Quoted queue refreshed.', 'info');
    } else if (this.activeStage() === 6) {
      this.loadPolicyQueue(PolicyQueueType.Policy);
      this.showToast('Policy queue refreshed.', 'info');
    } else if (this.activeStage() === 7) {
      this.loadPolicyQueue(PolicyQueueType.PolicyIssued);
      this.showToast('Policy Issued queue refreshed.', 'info');
    } else {
      this.loadQueue();
      this.showToast('Enquiry Queue refreshed.', 'info');
    }
  }

  loadAllEnquiries(): void {
    this.isAllEnquiriesLoading.set(true);

    const params: AdminAllEnquiriesFilterParams = {
      search: this.allEnquiriesSearchQuery().trim() || undefined,
      status: this.allEnquiriesSelectedStatus() !== 'All' ? Number(this.allEnquiriesSelectedStatus()) : undefined,
      insuranceTypeId: this.allEnquiriesSelectedInsuranceTypeId() !== 'All' ? this.allEnquiriesSelectedInsuranceTypeId() : undefined,
      vehicleTypeId: this.allEnquiriesSelectedVehicleTypeId() !== 'All' ? this.allEnquiriesSelectedVehicleTypeId() : undefined,
      accountId: this.allEnquiriesSelectedAccountId() !== 'All' ? this.allEnquiriesSelectedAccountId() : undefined,
      dateFilter: this.allEnquiriesSelectedDateFilter() || undefined,
      fromDate:
        this.allEnquiriesSelectedDateFilter() === DateFilterType.Custom && this.allEnquiriesFromDate()
          ? this.allEnquiriesFromDate()
          : undefined,
      toDate:
        this.allEnquiriesSelectedDateFilter() === DateFilterType.Custom && this.allEnquiriesToDate()
          ? this.allEnquiriesToDate()
          : undefined,
      sortDescending: this.allEnquiriesSortDescending(),
      pageNumber: this.allEnquiriesPageNumber(),
      pageSize: this.allEnquiriesPageSize(),
    };

    this.enquiryService
      .getAdminAllEnquiries(params)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isAllEnquiriesLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.allEnquiriesItems.set(res.data.items || []);
            this.allEnquiriesTotalRecords.set(res.data.totalRecords ?? (res.data.items?.length || 0));
            this.allEnquiriesTotalPages.set(res.data.totalPages ?? 1);
            this.allEnquiriesPageNumber.set(res.data.pageNumber ?? 1);
            this.allEnquiriesPageSize.set(res.data.pageSize ?? this.allEnquiriesPageSize());
            this.allEnquiriesHasPreviousPage.set(
              res.data.hasPreviousPage ?? (this.allEnquiriesPageNumber() > 1)
            );
            this.allEnquiriesHasNextPage.set(
              res.data.hasNextPage ?? (this.allEnquiriesPageNumber() < this.allEnquiriesTotalPages())
            );
          } else {
            this.showToast(res.message || 'Failed to fetch all enquiries.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch all enquiries.', 'error');
        },
      });
  }

  loadMyTasks(): void {
    this.isMyTasksLoading.set(true);

    const params: AdminMyTasksFilterParams = {
      search: this.myTasksSearchQuery().trim() || undefined,
      insuranceTypeId:
        this.myTasksSelectedInsuranceTypeId() !== 'All'
          ? this.myTasksSelectedInsuranceTypeId()
          : undefined,
      vehicleTypeId:
        this.myTasksSelectedVehicleTypeId() !== 'All'
          ? this.myTasksSelectedVehicleTypeId()
          : undefined,
      policyType:
        this.myTasksSelectedPolicyType() !== 'All'
          ? Number(this.myTasksSelectedPolicyType())
          : undefined,
      enquiryStatus:
        this.myTasksSelectedEnquiryStatus() !== 'All'
          ? Number(this.myTasksSelectedEnquiryStatus())
          : undefined,
      accountId:
        this.myTasksSelectedAccountId() !== 'All'
          ? this.myTasksSelectedAccountId()
          : undefined,
      dateFilter: this.myTasksSelectedDateFilter() || undefined,
      fromDate:
        this.myTasksSelectedDateFilter() === DateFilterType.Custom && this.myTasksFromDate()
          ? this.myTasksFromDate()
          : undefined,
      toDate:
        this.myTasksSelectedDateFilter() === DateFilterType.Custom && this.myTasksToDate()
          ? this.myTasksToDate()
          : undefined,
      sortBy: this.myTasksSortBy() ?? undefined,
      sortDirection: this.myTasksSortDirection(),
      pageNumber: this.myTasksPageNumber(),
      pageSize: this.myTasksPageSize(),
    };

    this.enquiryService
      .getAdminMyTasks(params)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isMyTasksLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.myTasksItems.set(res.data.items || []);
            this.myTasksTotalRecords.set(res.data.totalRecords ?? (res.data.items?.length || 0));
            this.myTasksTotalPages.set(res.data.totalPages ?? 1);
            this.myTasksPageNumber.set(res.data.pageNumber ?? 1);
            this.myTasksPageSize.set(res.data.pageSize ?? this.myTasksPageSize());
            this.myTasksHasPreviousPage.set(
              res.data.hasPreviousPage ?? (this.myTasksPageNumber() > 1)
            );
            this.myTasksHasNextPage.set(
              res.data.hasNextPage ?? (this.myTasksPageNumber() < this.myTasksTotalPages())
            );
          } else {
            this.showToast(res.message || 'Failed to fetch My Tasks.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch My Tasks.', 'error');
        },
      });
  }

  loadQuoteQueue(type?: number): void {
    this.isQuoteQueueLoading.set(true);

    const queueType =
      type !== undefined
        ? type
        : this.activeStage() === 4
        ? QuoteQueueType.Quote
        : QuoteQueueType.Quoted;

    const params: AdminQuoteQueueFilterParams = {
      type: queueType,
      search: this.quoteQueueSearchQuery().trim() || undefined,
      insuranceTypeId:
        this.quoteQueueSelectedInsuranceTypeId() !== 'All'
          ? this.quoteQueueSelectedInsuranceTypeId()
          : undefined,
      vehicleTypeId:
        this.quoteQueueSelectedVehicleTypeId() !== 'All'
          ? this.quoteQueueSelectedVehicleTypeId()
          : undefined,
      accountId:
        this.quoteQueueSelectedAccountId() !== 'All'
          ? this.quoteQueueSelectedAccountId()
          : undefined,
      dateFilter: this.quoteQueueSelectedDateFilter() || undefined,
      fromDate:
        this.quoteQueueSelectedDateFilter() === DateFilterType.Custom && this.quoteQueueFromDate()
          ? this.quoteQueueFromDate()
          : undefined,
      toDate:
        this.quoteQueueSelectedDateFilter() === DateFilterType.Custom && this.quoteQueueToDate()
          ? this.quoteQueueToDate()
          : undefined,
      sortDescending: this.quoteQueueSortDescending(),
      pageNumber: this.quoteQueuePageNumber(),
      pageSize: this.quoteQueuePageSize(),
    };

    this.enquiryService
      .getAdminMyQuoteQueue(params)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isQuoteQueueLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            const count = res.data.totalRecords ?? (res.data.items?.length || 0);
            if (queueType === QuoteQueueType.Quote) {
              this.quoteTotalRecords.set(count);
            } else {
              this.quotedTotalRecords.set(count);
            }

            const currentActiveType =
              this.activeStage() === 4 ? QuoteQueueType.Quote : QuoteQueueType.Quoted;
            if (queueType === currentActiveType) {
              this.quoteQueueItems.set(res.data.items || []);
              this.quoteQueueTotalPages.set(res.data.totalPages ?? 1);
              this.quoteQueuePageNumber.set(res.data.pageNumber ?? 1);
              this.quoteQueuePageSize.set(res.data.pageSize ?? this.quoteQueuePageSize());
              this.quoteQueueHasPreviousPage.set(
                res.data.hasPreviousPage ?? (this.quoteQueuePageNumber() > 1)
              );
              this.quoteQueueHasNextPage.set(
                res.data.hasNextPage ?? (this.quoteQueuePageNumber() < this.quoteQueueTotalPages())
              );
            }
          } else {
            this.showToast(res.message || 'Failed to fetch quote queue.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch quote queue.', 'error');
        },
      });
  }

  loadPolicyQueue(type?: number): void {
    this.isPolicyQueueLoading.set(true);

    const queueType =
      type !== undefined
        ? type
        : this.activeStage() === 6
        ? PolicyQueueType.Policy
        : PolicyQueueType.PolicyIssued;

    const params: AdminPolicyQueueFilterParams = {
      type: queueType,
      search: this.policyQueueSearchQuery().trim() || undefined,
      status:
        this.policyQueueSelectedStatus() !== 'All'
          ? Number(this.policyQueueSelectedStatus())
          : undefined,
      insuranceTypeId:
        this.policyQueueSelectedInsuranceTypeId() !== 'All'
          ? this.policyQueueSelectedInsuranceTypeId()
          : undefined,
      vehicleTypeId:
        this.policyQueueSelectedVehicleTypeId() !== 'All'
          ? this.policyQueueSelectedVehicleTypeId()
          : undefined,
      accountId:
        this.policyQueueSelectedAccountId() !== 'All'
          ? this.policyQueueSelectedAccountId()
          : undefined,
      dateFilter: this.policyQueueSelectedDateFilter() || undefined,
      fromDate:
        this.policyQueueSelectedDateFilter() === DateFilterType.Custom && this.policyQueueFromDate()
          ? this.policyQueueFromDate()
          : undefined,
      toDate:
        this.policyQueueSelectedDateFilter() === DateFilterType.Custom && this.policyQueueToDate()
          ? this.policyQueueToDate()
          : undefined,
      sortDescending: this.policyQueueSortDescending(),
      pageNumber: this.policyQueuePageNumber(),
      pageSize: this.policyQueuePageSize(),
    };

    this.enquiryService
      .getAdminMyPolicyQueue(params)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isPolicyQueueLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            const count = res.data.totalRecords ?? (res.data.items?.length || 0);
            if (queueType === PolicyQueueType.Policy) {
              this.policyTotalRecords.set(count);
            } else {
              this.policyIssuedTotalRecords.set(count);
            }

            const currentActiveType =
              this.activeStage() === 6 ? PolicyQueueType.Policy : PolicyQueueType.PolicyIssued;
            if (queueType === currentActiveType) {
              this.policyQueueItems.set(res.data.items || []);
              this.policyQueueTotalPages.set(res.data.totalPages ?? 1);
              this.policyQueuePageNumber.set(res.data.pageNumber ?? 1);
              this.policyQueuePageSize.set(res.data.pageSize ?? this.policyQueuePageSize());
              this.policyQueueHasPreviousPage.set(
                res.data.hasPreviousPage ?? (this.policyQueuePageNumber() > 1)
              );
              this.policyQueueHasNextPage.set(
                res.data.hasNextPage ?? (this.policyQueuePageNumber() < this.policyQueueTotalPages())
              );
            }
          } else {
            this.showToast(res.message || 'Failed to fetch policy queue.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch policy queue.', 'error');
        },
      });
  }

  onStageSelect(stageId: number): void {
    this.activeStage.set(stageId);
    if (stageId === 1) {
      this.loadQueue();
    } else if (stageId === 2) {
      this.loadAllEnquiries();
    } else if (stageId === 3) {
      this.loadMyTasks();
    } else if (stageId === 4) {
      this.quoteQueuePageNumber.set(1);
      this.loadQuoteQueue(QuoteQueueType.Quote);
    } else if (stageId === 5) {
      this.quoteQueuePageNumber.set(1);
      this.loadQuoteQueue(QuoteQueueType.Quoted);
    } else if (stageId === 6) {
      this.policyQueuePageNumber.set(1);
      this.loadPolicyQueue(PolicyQueueType.Policy);
    } else if (stageId === 7) {
      this.policyQueuePageNumber.set(1);
      this.loadPolicyQueue(PolicyQueueType.PolicyIssued);
    } else {
      const stage = this.stages.find((s) => s.id === stageId);
      this.showToast(`Stage "${stage?.label}" will be configured in the next phase.`, 'info');
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  submitSearch(): void {
    this.pageNumber.set(1);
    this.loadQueue();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadQueue();
  }

  onInsuranceTypeChange(typeId: string): void {
    this.selectedInsuranceTypeId.set(typeId);
    this.pageNumber.set(1);
    this.loadQueue();
  }

  onVehicleTypeChange(typeId: string): void {
    this.selectedVehicleTypeId.set(typeId);
    this.pageNumber.set(1);
    this.loadQueue();
  }

  onDateFilterChange(filterValue: string): void {
    const num = parseInt(filterValue, 10);
    this.selectedDateFilter.set(isNaN(num) ? DateFilterType.Today : num);
    if (num !== DateFilterType.Custom) {
      this.fromDate.set('');
      this.toDate.set('');
    }
    this.pageNumber.set(1);
    this.loadQueue();
  }

  onCustomDateChange(): void {
    this.selectedDateFilter.set(DateFilterType.Custom);
    this.pageNumber.set(1);
    this.loadQueue();
  }

  // All Enquiries (Tab 2) filter handlers
  onAllEnquiriesSearchChange(query: string): void {
    this.allEnquiriesSearchQuery.set(query);
  }

  submitAllEnquiriesSearch(): void {
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  clearAllEnquiriesSearch(): void {
    this.allEnquiriesSearchQuery.set('');
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesStatusChange(status: string | number): void {
    this.allEnquiriesSelectedStatus.set(status === 'All' ? 'All' : Number(status));
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesInsuranceTypeChange(typeId: string): void {
    this.allEnquiriesSelectedInsuranceTypeId.set(typeId);
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesVehicleTypeChange(typeId: string): void {
    this.allEnquiriesSelectedVehicleTypeId.set(typeId);
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesAccountChange(accountId: string): void {
    this.allEnquiriesSelectedAccountId.set(accountId);
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesDateFilterChange(filterValue: string): void {
    const num = parseInt(filterValue, 10);
    this.allEnquiriesSelectedDateFilter.set(isNaN(num) ? DateFilterType.Today : num);
    if (num !== DateFilterType.Custom) {
      this.allEnquiriesFromDate.set('');
      this.allEnquiriesToDate.set('');
    }
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesCustomDateChange(): void {
    this.allEnquiriesSelectedDateFilter.set(DateFilterType.Custom);
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  onAllEnquiriesPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.allEnquiriesTotalPages() || newPage === this.allEnquiriesPageNumber()) {
      return;
    }
    this.allEnquiriesPageNumber.set(newPage);
    this.loadAllEnquiries();
  }

  onAllEnquiriesPageSizeChange(newSize: number): void {
    this.allEnquiriesPageSize.set(Number(newSize));
    this.allEnquiriesPageNumber.set(1);
    this.loadAllEnquiries();
  }

  // My Tasks (Tab 3) filter handlers
  onMyTasksSearchChange(query: string): void {
    this.myTasksSearchQuery.set(query);
  }

  submitMyTasksSearch(): void {
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  clearMyTasksSearch(): void {
    this.myTasksSearchQuery.set('');
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksEnquiryStatusChange(status: string | number): void {
    this.myTasksSelectedEnquiryStatus.set(status === 'All' ? 'All' : Number(status));
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksPolicyTypeChange(policyType: string | number): void {
    this.myTasksSelectedPolicyType.set(policyType === 'All' ? 'All' : Number(policyType));
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksInsuranceTypeChange(typeId: string): void {
    this.myTasksSelectedInsuranceTypeId.set(typeId);
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksVehicleTypeChange(typeId: string): void {
    this.myTasksSelectedVehicleTypeId.set(typeId);
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksAccountChange(accountId: string): void {
    this.myTasksSelectedAccountId.set(accountId);
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksDateFilterChange(filterValue: string): void {
    const num = parseInt(filterValue, 10);
    this.myTasksSelectedDateFilter.set(isNaN(num) ? DateFilterType.Today : num);
    if (num !== DateFilterType.Custom) {
      this.myTasksFromDate.set('');
      this.myTasksToDate.set('');
    }
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksCustomDateChange(): void {
    this.myTasksSelectedDateFilter.set(DateFilterType.Custom);
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  onMyTasksPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.myTasksTotalPages() || newPage === this.myTasksPageNumber()) {
      return;
    }
    this.myTasksPageNumber.set(newPage);
    this.loadMyTasks();
  }

  onMyTasksPageSizeChange(newSize: number): void {
    this.myTasksPageSize.set(Number(newSize));
    this.myTasksPageNumber.set(1);
    this.loadMyTasks();
  }

  // Quote & Quoted Queue (Tabs 4 & 5) filter handlers
  onQuoteQueueSearchChange(query: string): void {
    this.quoteQueueSearchQuery.set(query);
  }

  submitQuoteQueueSearch(): void {
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  clearQuoteQueueSearch(): void {
    this.quoteQueueSearchQuery.set('');
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueueInsuranceTypeChange(typeId: string): void {
    this.quoteQueueSelectedInsuranceTypeId.set(typeId);
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueueVehicleTypeChange(typeId: string): void {
    this.quoteQueueSelectedVehicleTypeId.set(typeId);
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueueAccountChange(accountId: string): void {
    this.quoteQueueSelectedAccountId.set(accountId);
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueueDateFilterChange(filterValue: string): void {
    const num = parseInt(filterValue, 10);
    this.quoteQueueSelectedDateFilter.set(isNaN(num) ? DateFilterType.Today : num);
    if (num !== DateFilterType.Custom) {
      this.quoteQueueFromDate.set('');
      this.quoteQueueToDate.set('');
    }
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueueCustomDateChange(): void {
    this.quoteQueueSelectedDateFilter.set(DateFilterType.Custom);
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  onQuoteQueuePageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.quoteQueueTotalPages() || newPage === this.quoteQueuePageNumber()) {
      return;
    }
    this.quoteQueuePageNumber.set(newPage);
    this.loadQuoteQueue();
  }

  onQuoteQueuePageSizeChange(newSize: number): void {
    this.quoteQueuePageSize.set(Number(newSize));
    this.quoteQueuePageNumber.set(1);
    this.loadQuoteQueue();
  }

  // Policy & Policy Issued Queue (Tabs 6 & 7) filter handlers
  onPolicyQueueSearchChange(query: string): void {
    this.policyQueueSearchQuery.set(query);
  }

  submitPolicyQueueSearch(): void {
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  clearPolicyQueueSearch(): void {
    this.policyQueueSearchQuery.set('');
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueStatusChange(status: string | number): void {
    this.policyQueueSelectedStatus.set(status === 'All' ? 'All' : Number(status));
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueInsuranceTypeChange(typeId: string): void {
    this.policyQueueSelectedInsuranceTypeId.set(typeId);
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueVehicleTypeChange(typeId: string): void {
    this.policyQueueSelectedVehicleTypeId.set(typeId);
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueAccountChange(accountId: string): void {
    this.policyQueueSelectedAccountId.set(accountId);
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueDateFilterChange(filterValue: string): void {
    const num = parseInt(filterValue, 10);
    this.policyQueueSelectedDateFilter.set(isNaN(num) ? DateFilterType.Today : num);
    if (num !== DateFilterType.Custom) {
      this.policyQueueFromDate.set('');
      this.policyQueueToDate.set('');
    }
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueueCustomDateChange(): void {
    this.policyQueueSelectedDateFilter.set(DateFilterType.Custom);
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  onPolicyQueuePageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.policyQueueTotalPages() || newPage === this.policyQueuePageNumber()) {
      return;
    }
    this.policyQueuePageNumber.set(newPage);
    this.loadPolicyQueue();
  }

  onPolicyQueuePageSizeChange(newSize: number): void {
    this.policyQueuePageSize.set(Number(newSize));
    this.policyQueuePageNumber.set(1);
    this.loadPolicyQueue();
  }

  toggleSortOrder(): void {
    if (this.activeStage() === 2) {
      this.allEnquiriesSortDescending.update((val) => !val);
      this.allEnquiriesPageNumber.set(1);
      this.loadAllEnquiries();
    } else if (this.activeStage() === 3) {
      this.myTasksSortDirection.set(
        this.myTasksSortDirection() === SortDirectionEnum.Descending
          ? SortDirectionEnum.Ascending
          : SortDirectionEnum.Descending
      );
      this.myTasksPageNumber.set(1);
      this.loadMyTasks();
    } else if (this.activeStage() === 4 || this.activeStage() === 5) {
      this.quoteQueueSortDescending.update((val) => !val);
      this.quoteQueuePageNumber.set(1);
      this.loadQuoteQueue();
    } else if (this.activeStage() === 6 || this.activeStage() === 7) {
      this.policyQueueSortDescending.update((val) => !val);
      this.policyQueuePageNumber.set(1);
      this.loadPolicyQueue();
    } else {
      this.sortDescending.update((val) => !val);
      this.pageNumber.set(1);
      this.loadQueue();
    }
  }

  resetAllFilters(): void {
    if (this.activeStage() === 2) {
      this.allEnquiriesSearchQuery.set('');
      this.allEnquiriesSelectedStatus.set('All');
      this.allEnquiriesSelectedInsuranceTypeId.set('All');
      this.allEnquiriesSelectedVehicleTypeId.set('All');
      this.allEnquiriesSelectedAccountId.set('All');
      this.allEnquiriesSelectedDateFilter.set(DateFilterType.Today);
      this.allEnquiriesFromDate.set('');
      this.allEnquiriesToDate.set('');
      this.allEnquiriesSortDescending.set(true);
      this.allEnquiriesPageNumber.set(1);
      this.loadAllEnquiries();
      this.showToast('All filters have been reset to Today.', 'info');
    } else if (this.activeStage() === 3) {
      this.myTasksSearchQuery.set('');
      this.myTasksSelectedInsuranceTypeId.set('All');
      this.myTasksSelectedVehicleTypeId.set('All');
      this.myTasksSelectedPolicyType.set('All');
      this.myTasksSelectedEnquiryStatus.set('All');
      this.myTasksSelectedAccountId.set('All');
      this.myTasksSelectedDateFilter.set(DateFilterType.Today);
      this.myTasksFromDate.set('');
      this.myTasksToDate.set('');
      this.myTasksSortDirection.set(SortDirectionEnum.Descending);
      this.myTasksSortBy.set(undefined);
      this.myTasksPageNumber.set(1);
      this.loadMyTasks();
      this.showToast('My Tasks filters have been reset to Today.', 'info');
    } else if (this.activeStage() === 4 || this.activeStage() === 5) {
      this.quoteQueueSearchQuery.set('');
      this.quoteQueueSelectedInsuranceTypeId.set('All');
      this.quoteQueueSelectedVehicleTypeId.set('All');
      this.quoteQueueSelectedAccountId.set('All');
      this.quoteQueueSelectedDateFilter.set(DateFilterType.Today);
      this.quoteQueueFromDate.set('');
      this.quoteQueueToDate.set('');
      this.quoteQueueSortDescending.set(true);
      this.quoteQueuePageNumber.set(1);
      this.loadQuoteQueue();
      this.showToast(
        this.activeStage() === 4
          ? 'Quote filters have been reset to Today.'
          : 'Quoted filters have been reset to Today.',
        'info'
      );
    } else if (this.activeStage() === 6 || this.activeStage() === 7) {
      this.policyQueueSearchQuery.set('');
      this.policyQueueSelectedStatus.set('All');
      this.policyQueueSelectedInsuranceTypeId.set('All');
      this.policyQueueSelectedVehicleTypeId.set('All');
      this.policyQueueSelectedAccountId.set('All');
      this.policyQueueSelectedDateFilter.set(DateFilterType.Today);
      this.policyQueueFromDate.set('');
      this.policyQueueToDate.set('');
      this.policyQueueSortDescending.set(true);
      this.policyQueuePageNumber.set(1);
      this.loadPolicyQueue();
      this.showToast(
        this.activeStage() === 6
          ? 'Policy filters have been reset to Today.'
          : 'Policy Issued filters have been reset to Today.',
        'info'
      );
    } else {
      this.searchQuery.set('');
      this.selectedInsuranceTypeId.set('All');
      this.selectedVehicleTypeId.set('All');
      this.selectedDateFilter.set(DateFilterType.Today);
      this.fromDate.set('');
      this.toDate.set('');
      this.sortDescending.set(true);
      this.pageNumber.set(1);
      this.loadQueue();
      this.showToast('All filters have been reset to Today.', 'info');
    }
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) {
      return;
    }
    this.pageNumber.set(newPage);
    this.loadQueue();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadQueue();
  }

  // Right Section Control Actions
  onNewEnquiry(): void {
    this.router.navigate(['/create-enquiry']);
  }

  onTransactions(): void {
    this.showToast('Transactions & Payment Ledger will be configured in next phase.', 'info');
  }

  onAssignQueue(): void {
    this.showToast('Batch queue assignment to employees will be configured in next phase.', 'info');
  }

  exportQueueCsv(): void {
    if (this.activeStage() === 2) {
      this.exportAllEnquiriesCsv();
      return;
    }
    if (this.activeStage() === 3) {
      this.exportMyTasksCsv();
      return;
    }
    if (this.activeStage() === 4 || this.activeStage() === 5) {
      this.exportQuoteQueueCsv();
      return;
    }
    if (this.activeStage() === 6 || this.activeStage() === 7) {
      this.exportPolicyQueueCsv();
      return;
    }

    const items = this.queueItems();
    if (items.length === 0) {
      this.showToast('No queue items to export.', 'error');
      return;
    }

    const headers = [
      'Enquiry ID',
      'Customer Name',
      'Phone',
      'Vehicle Plate',
      'Vehicle Category',
      'Policy Type',
      'Insurance Line',
      'Agency',
      'Creator',
      'Status',
      'Submitted On',
      'Priority',
    ];
    const rows = items.map((item) => [
      item.enquiryId,
      `"${item.customerName || ''}"`,
      `"${item.customerNumber || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${item.policyType || ''}"`,
      `"${item.insuranceType || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.createdBy || ''}"`,
      `"${item.status || ''}"`,
      `"${item.submittedOn || ''}"`,
      this.getPriorityLabel(item.priority),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Common_Queue_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Common queue records exported to CSV.', 'success');
  }

  exportAllEnquiriesCsv(): void {
    const items = this.allEnquiriesItems();
    if (items.length === 0) {
      this.showToast('No enquiries to export.', 'error');
      return;
    }

    const headers = [
      'Enquiry ID',
      'Customer Name',
      'Phone',
      'Vehicle Plate',
      'Vehicle Category',
      'Policy Type',
      'Insurance Line',
      'Agency',
      'Creator',
      'Status',
      'Assigned Employee',
      'Quote Count',
      'Submitted On',
    ];
    const rows = items.map((item) => [
      item.enquiryId,
      `"${item.customerName || ''}"`,
      `"${item.customerNumber || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${item.policyType || ''}"`,
      `"${item.insuranceType || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.createdBy || ''}"`,
      `"${this.getEnquiryStatusLabel(item.status)}"`,
      `"${item.assignedEmployee || item.assignedEmployeeName || 'Unassigned'}"`,
      item.quoteCount ?? 0,
      `"${item.submittedOn || item.createdAt || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `All_Enquiries_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('All enquiries exported to CSV.', 'success');
  }

  openAllEnquiryDetails(item: AdminAllEnquiryItem, event?: Event): void {
    if (event) event.stopPropagation();
    const mappedEnquiry: EnquiryItem = {
      id: item.id,
      enquiryId: item.enquiryId,
      customerName: item.customerName,
      phoneNumber: item.customerNumber,
      customerPhone: item.customerNumber,
      vehicleNumber: item.vehicleNumber,
      insuranceType: item.insuranceType || 'Vehicle Insurance',
      policyType: item.policyType || 'Comprehensive',
      vehicleType: item.vehicleType || 'Vehicle',
      status: (this.getEnquiryStatusLabel(item.status) as any) || 'Submitted',
      createdAt: item.submittedOn || item.createdAt || '',
      agentName: item.createdBy,
      agencyName: item.agencyName,
      assignedAgentName: item.assignedEmployee || item.assignedEmployeeName || item.createdBy,
      assignedStaff: item.assignedEmployee || item.assignedEmployeeName || undefined,
    };
    this.selectedEnquiry.set(mappedEnquiry);
  }

  onAssignToMeAllEnquiry(item: AdminAllEnquiryItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.showToast(`Assign action for "${item.enquiryId}" will be configured in next phase.`, 'info');
  }

  openMyTaskDetails(item: AdminMyTaskItem, event?: Event): void {
    if (event) event.stopPropagation();
    const mappedEnquiry: EnquiryItem = {
      id: item.id,
      enquiryId: item.enquiryId,
      customerName: item.customerName,
      phoneNumber: item.customerNumber,
      customerPhone: item.customerNumber,
      vehicleNumber: item.vehicleNumber,
      insuranceType: item.insuranceType || 'Vehicle Insurance',
      policyType: this.getPolicyTypeLabel(item.policyType),
      vehicleType: item.vehicleType || 'Vehicle',
      status: (this.getEnquiryStatusLabel(item.enquiryStatus ?? item.status) as any) || 'Submitted',
      createdAt: item.submittedOn || item.createdAt || '',
      agentName: item.createdBy,
      agencyName: item.agencyName,
      assignedAgentName: item.createdBy,
      assignedStaff: 'Admin',
    };
    this.selectedEnquiry.set(mappedEnquiry);
  }

  exportMyTasksCsv(): void {
    const items = this.myTasksItems();
    if (items.length === 0) {
      this.showToast('No My Tasks enquiries to export.', 'error');
      return;
    }

    const headers = [
      'Enquiry ID',
      'Customer Name',
      'Phone',
      'Vehicle Plate',
      'Vehicle Category',
      'Policy Type',
      'Insurance Line',
      'Status',
      'Priority',
      'Creator',
      'Creator Role',
      'Creator Phone',
      'Agency',
      'Submitted On',
    ];

    const rows = items.map((item) => [
      item.enquiryId,
      `"${item.customerName || ''}"`,
      `"${item.customerNumber || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${this.getPolicyTypeLabel(item.policyType)}"`,
      `"${item.insuranceType || ''}"`,
      `"${this.getEnquiryStatusLabel(item.enquiryStatus ?? item.status)}"`,
      this.getPriorityLabel(item.priority),
      `"${item.createdBy || ''}"`,
      `"${item.createdByRole || ''}"`,
      `"${item.createdByPhone || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.submittedOn || item.createdAt || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `My_Tasks_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('My Tasks enquiries exported to CSV.', 'success');
  }

  openQuoteQueueDetails(item: AdminQuoteQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    const mappedEnquiry: EnquiryItem = {
      id: item.id,
      enquiryId: item.enquiryId,
      customerName: item.customerName,
      phoneNumber: item.customerNumber,
      customerPhone: item.customerNumber,
      vehicleNumber: item.vehicleNumber,
      insuranceType: item.insuranceType || 'Vehicle Insurance',
      policyType: this.getPolicyTypeLabel(item.policyType),
      vehicleType: item.vehicleType || 'Vehicle',
      status: (this.getEnquiryStatusLabel(item.status) as any) || (this.activeStage() === 4 ? 'QuoteInProgress' : 'Quoted'),
      createdAt: item.submittedOn || item.createdAt || '',
      agentName: item.createdBy,
      agencyName: item.agencyName,
      assignedAgentName: item.assignedEmployee || item.createdBy,
      assignedStaff: item.assignedEmployee || undefined,
    };
    this.selectedEnquiry.set(mappedEnquiry);
  }

  onProcessQuote(item: AdminQuoteQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/enquiry-quotes', item.id || item.enquiryId]);
  }

  exportQuoteQueueCsv(): void {
    const items = this.quoteQueueItems();
    if (items.length === 0) {
      this.showToast('No quote queue items to export.', 'error');
      return;
    }

    const stageLabel = this.activeStage() === 4 ? 'Quote' : 'Quoted';
    const headers = [
      'Enquiry ID',
      'Customer Name',
      'Phone',
      'Vehicle Plate',
      'Vehicle Category',
      'Policy Type',
      'Insurance Line',
      'Agency',
      'Creator',
      'Creator Role',
      'Creator Phone',
      'Assigned Employee',
      'Assigned Role',
      'Quote Count',
      'Status',
      'Admin Assisted',
      'Priority',
      'Submitted On',
    ];

    const rows = items.map((item) => [
      item.enquiryId,
      `"${item.customerName || ''}"`,
      `"${item.customerNumber || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${this.getPolicyTypeLabel(item.policyType)}"`,
      `"${item.insuranceType || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.createdBy || ''}"`,
      `"${item.createdByRole || ''}"`,
      `"${item.createdByPhone || ''}"`,
      `"${item.assignedEmployee || 'Unassigned'}"`,
      `"${item.assignedEmployeeRole || ''}"`,
      item.quoteCount ?? 0,
      `"${this.getEnquiryStatusLabel(item.status)}"`,
      item.adminAssisted ? 'Yes' : 'No',
      this.getPriorityLabel(item.priority),
      `"${item.submittedOn || item.createdAt || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${stageLabel}_Queue_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`${stageLabel} queue exported to CSV.`, 'success');
  }

  openPolicyQueueDetails(item: AdminPolicyQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    const mappedEnquiry: EnquiryItem = {
      id: item.id,
      enquiryId: item.enquiryId,
      customerName: item.customerName,
      phoneNumber: item.customerNumber,
      customerPhone: item.customerNumber,
      vehicleNumber: item.vehicleNumber,
      insuranceType: item.insuranceType || 'Vehicle Insurance',
      policyType: this.getPolicyTypeLabel(item.policyType),
      vehicleType: item.vehicleType || 'Vehicle',
      status: (this.getEnquiryStatusLabel(item.status) as any) || (this.activeStage() === 6 ? 'PolicyInProgress' : 'PolicyIssued'),
      createdAt: item.submittedOn || item.createdAt || '',
      agentName: item.createdBy,
      agencyName: item.agencyName,
      assignedAgentName: item.assignedEmployee || item.createdBy,
      assignedStaff: item.assignedEmployee || undefined,
    };
    this.selectedEnquiry.set(mappedEnquiry);
  }

  onProcessPolicy(item: AdminPolicyQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/policy', item.id || item.enquiryId]);
  }

  exportPolicyQueueCsv(): void {
    const items = this.policyQueueItems();
    if (items.length === 0) {
      this.showToast('No policy queue items to export.', 'error');
      return;
    }

    const stageLabel = this.activeStage() === 6 ? 'Policy' : 'Policy_Issued';
    const headers = [
      'Enquiry ID',
      'Customer Name',
      'Phone',
      'Vehicle Plate',
      'Vehicle Category',
      'Policy Type',
      'Insurance Line',
      'Agency',
      'Creator',
      'Creator Role',
      'Creator Phone',
      'Assigned Employee',
      'Assigned Role',
      'Quote Count',
      'Status',
      'Admin Assisted',
      'Priority',
      'Submitted On',
    ];

    const rows = items.map((item) => [
      item.enquiryId,
      `"${item.customerName || ''}"`,
      `"${item.customerNumber || ''}"`,
      `"${item.vehicleNumber || ''}"`,
      `"${item.vehicleType || ''}"`,
      `"${this.getPolicyTypeLabel(item.policyType)}"`,
      `"${item.insuranceType || ''}"`,
      `"${item.agencyName || ''}"`,
      `"${item.createdBy || ''}"`,
      `"${item.createdByRole || ''}"`,
      `"${item.createdByPhone || ''}"`,
      `"${item.assignedEmployee || 'Unassigned'}"`,
      `"${item.assignedEmployeeRole || ''}"`,
      item.quoteCount ?? 0,
      `"${this.getEnquiryStatusLabel(item.status)}"`,
      item.adminAssisted ? 'Yes' : 'No',
      this.getPriorityLabel(item.priority),
      `"${item.submittedOn || item.createdAt || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${stageLabel}_Queue_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`${stageLabel.replace('_', ' ')} queue exported to CSV.`, 'success');
  }

  getPolicyTypeLabel(policyType: string | number | undefined | null): string {
    if (policyType === undefined || policyType === null) return 'Comprehensive';
    if (typeof policyType === 'number') {
      switch (policyType) {
        case 1:
          return 'Comprehensive';
        case 2:
          return 'Third Party';
        case 3:
          return 'Own Damage';
        default:
          return String(policyType);
      }
    }
    if (policyType === 'ThirdParty') return 'Third Party';
    if (policyType === 'OwnDamage') return 'Own Damage';
    return String(policyType);
  }

  getEnquiryStatusLabel(status: string | number | undefined | null): string {
    if (status === undefined || status === null) return 'Created';
    if (typeof status === 'number') {
      switch (status) {
        case 1:
          return 'Created';
        case 2:
          return 'Submitted';
        case 3:
          return 'QuoteInProgress';
        case 4:
          return 'Quoted';
        case 5:
          return 'PaymentVerificationPending';
        case 6:
          return 'PolicyInProgress';
        case 7:
          return 'PolicyIssued';
        case 8:
          return 'Cancelled';
        default:
          return String(status);
      }
    }
    return String(status);
  }

  getEnquiryStatusClass(status: string | number | undefined | null): string {
    const raw = this.getEnquiryStatusLabel(status);
    switch (raw) {
      case 'PolicyIssued':
        return 'tag-success';
      case 'Submitted':
      case 'Quoted':
        return 'tag-active';
      case 'QuoteInProgress':
      case 'PolicyInProgress':
        return 'tag-progress';
      case 'PaymentVerificationPending':
        return 'tag-purple';
      case 'Cancelled':
        return 'tag-cancelled';
      default:
        return 'tag-default';
    }
  }

  // Row selection and drawer
  openEnquiryDetails(item: AdminCommonQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    const mappedEnquiry: EnquiryItem = {
      id: item.id,
      enquiryId: item.enquiryId,
      customerName: item.customerName,
      phoneNumber: item.customerNumber,
      customerPhone: item.customerNumber,
      vehicleNumber: item.vehicleNumber,
      insuranceType: item.insuranceType,
      policyType: item.policyType,
      vehicleType: item.vehicleType,
      status: (item.status as any) || 'Submitted',
      createdAt: item.submittedOn,
      agentName: item.createdBy,
      agencyName: item.agencyName,
      assignedAgentName: item.createdBy,
    };
    this.selectedEnquiry.set(mappedEnquiry);
  }

  closeDetailDrawer(): void {
    this.selectedEnquiry.set(null);
  }

  // Control Actions (Prepared for upcoming stages and buttons)
  onAssignToMe(item: AdminCommonQueueItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.showToast(`Assign action for "${item.enquiryId}" will be configured in next phase.`, 'info');
  }

  // Formatting helpers
  getPriorityLabel(priority: number | undefined | null): string {
    switch (priority) {
      case 2:
        return 'Urgent';
      case 1:
        return 'High';
      default:
        return 'Normal';
    }
  }

  getPriorityClass(priority: number | undefined | null): string {
    switch (priority) {
      case 2:
        return 'priority-urgent';
      case 1:
        return 'priority-high';
      default:
        return 'priority-normal';
    }
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

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  getWhatsAppUrl(phone: string): string {
    if (!phone) return '#';
    const cleanNumber = phone.replace(/\D/g, '');
    const standardNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    return `https://wa.me/${standardNumber}`;
  }

  copyToClipboard(text: string, label: string, event?: Event): void {
    if (event) event.stopPropagation();
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
}
