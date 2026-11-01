import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import {
  AdminCommonQueueFilterParams,
  AdminCommonQueueItem,
  DateFilterType,
  EnquiryItem,
  InsuranceTypeItem,
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

  // Queue Data State
  readonly queueItems = signal<AdminCommonQueueItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(4);
  readonly hasPreviousPage = signal<boolean>(false);
  readonly hasNextPage = signal<boolean>(false);

  // Filter States
  readonly DateFilterType = DateFilterType;
  readonly searchQuery = signal<string>('');
  readonly selectedInsuranceTypeId = signal<string>('All');
  readonly selectedVehicleTypeId = signal<string>('All');
  readonly selectedDateFilter = signal<number>(DateFilterType.Today);
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly sortDescending = signal<boolean>(true);

  // Lookups
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);

  // Toast & Feedback
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('info');
  readonly copiedField = signal<string | null>(null);

  // Detail Modal / Drawer state
  readonly selectedEnquiry = signal<EnquiryItem | null>(null);

  // Computed summary
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

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadQueue();
  }

  loadDropdownData(): void {
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
    this.loadQueue();
    this.showToast('Enquiry Queue refreshed.', 'info');
  }

  onStageSelect(stageId: number): void {
    this.activeStage.set(stageId);
    if (stageId === 1) {
      this.loadQueue();
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

  toggleSortOrder(): void {
    this.sortDescending.update((val) => !val);
    this.pageNumber.set(1);
    this.loadQueue();
  }

  resetAllFilters(): void {
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
  getPriorityLabel(priority: number): string {
    switch (priority) {
      case 2:
        return 'Urgent';
      case 1:
        return 'High';
      default:
        return 'Normal';
    }
  }

  getPriorityClass(priority: number): string {
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
