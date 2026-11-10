import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AdminEnquiryDetails, AdminEnquiryRcDetails, AdminPolicyDetails, AdminPolicyPaymentDetails, UploadDocPayload } from '../../../models/enquiry.model';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { BankAccountService } from '../../../services/bank-account/bank-account.service';
import { BankAccountItem } from '../../../models/bank-account.model';

type DetailField = { label: string; value: string };
type DetailSection = { title: string; fields: DetailField[] };

const RC_SECTIONS: Array<{ title: string; fields: Array<[keyof AdminEnquiryRcDetails, string]> }> = [
  { title: 'Vehicle identity', fields: [['vehicleNumber', 'Registration number'], ['vehicleClass', 'Vehicle class'], ['manufacturerName', 'Manufacturer'], ['model', 'Model'], ['vehicleColor', 'Color'], ['fuelType', 'Fuel type'], ['bodyType', 'Body type'], ['vehicleCategory', 'Vehicle category'], ['normsType', 'Emission norms'], ['cubicCapacity', 'Cubic capacity'], ['chassisNumber', 'Chassis number'], ['engineNumber', 'Engine number']] },
  { title: 'Vehicle specifications', fields: [['grossVehicleWeight', 'Gross vehicle weight'], ['unladenWeight', 'Unladen weight'], ['wheelbase', 'Wheelbase'], ['seatCapacity', 'Seat capacity'], ['cylinderCount', 'Cylinder count']] },
  { title: 'Owner', fields: [['ownerName', 'Owner name'], ['ownerFatherName', "Owner's father name"], ['mobileNumber', 'Mobile number'], ['ownerCount', 'Owner count']] },
  { title: 'Registration', fields: [['registrationAuthority', 'Registration authority'], ['registrationDate', 'Registration date'], ['rcExpiryDate', 'RC expiry date'], ['manufacturingMonthYear', 'Manufacturing month/year'], ['vehicleTaxUpto', 'Vehicle tax valid to'], ['rtoCode', 'RTO code']] },
  { title: 'Existing insurance', fields: [['insuranceCompanyName', 'Insurance company'], ['insurancePolicyNumber', 'Policy number'], ['insuranceValidUpto', 'Insurance valid to']] },
  { title: 'Finance and pollution', fields: [['isFinanced', 'Financed'], ['financerName', 'Financer'], ['puccNumber', 'PUCC number'], ['puccUpto', 'PUCC valid to']] },
  { title: 'Present address', fields: [['presentAddress', 'Address'], ['presentCity', 'City'], ['presentDistrict', 'District'], ['presentState', 'State'], ['presentPincode', 'PIN code']] },
  { title: 'Permanent address', fields: [['permanentAddress', 'Address'], ['permanentCity', 'City'], ['permanentDistrict', 'District'], ['permanentState', 'State'], ['permanentPincode', 'PIN code']] },
];

@Component({
  selector: 'app-admin-enquiry-view-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-enquiry-view-details.html',
  styleUrl: './admin-enquiry-view-details.css',
})
export class AdminEnquiryViewDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(EnquiryService);
  private readonly bankAccountService = inject(BankAccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly enquiryId = signal('');
  readonly enquiry = signal<AdminEnquiryDetails | null>(null);
  readonly activeTab = signal<'vehicle' | 'payment' | 'documents' | 'quotes' | 'vendor' | 'policy'>('vehicle');
  readonly policyDetails = signal<AdminPolicyDetails | null>(null);
  readonly policyLoading = signal(false);
  readonly policySaving = signal(false);
  readonly policyLoadError = signal('');
  readonly policyError = signal('');
  readonly policySuccess = signal('');
  readonly policyFile = signal<File | null>(null);
  readonly policyUploading = signal(false);
  readonly policyUploadError = signal('');
  readonly policyUploadSuccess = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly copied = signal('');
  readonly paymentModalOpen = signal(false);
  readonly paymentLoading = signal(false);
  readonly paymentSubmitting = signal(false);
  readonly paymentSectionLoading = signal(false);
  readonly paymentSectionExpanded = signal(false);
  readonly paymentDetails = signal<AdminPolicyPaymentDetails | null>(null);
  readonly paymentError = signal('');
  readonly paymentSectionError = signal('');
  readonly paymentVerificationError = signal('');
  readonly paymentReviewAvailable = signal(false);
  readonly verifiedPaymentId = signal<string | null>(null);
  readonly paymentNotice = signal('');
  readonly paymentConfirmation = signal<'approve' | 'reject' | null>(null);
  readonly paymentActionRemarks = signal('');
  readonly quoteModalOpen = signal(false);
  readonly quoteSubmitting = signal(false);
  readonly quoteError = signal('');
  readonly quoteSuccess = signal('');
  readonly statusModalOpen = signal(false);
  readonly statusSubmitting = signal(false);
  readonly statusError = signal('');
  readonly statusSuccess = signal('');
  readonly cancellationModalOpen = signal(false);
  readonly cancellationReason = signal('');
  readonly cancellationPayment = signal<AdminPolicyPaymentDetails | null>(null);
  readonly cancellationPaymentLoading = signal(false);
  readonly cancellationPaymentError = signal('');
  readonly refundBankAccountId = signal('');
  readonly companies = signal<Array<{ id: string; companyName: string }>>([]);
  readonly vendors = signal<Array<{ id: string; name: string; isActive: boolean }>>([]);
  readonly bankAccounts = signal<BankAccountItem[]>([]);
  readonly bankAccountsLoading = signal(false);
  readonly vendorSettlementLoading = signal(false);
  readonly vendorSettlementSubmitting = signal(false);
  readonly vendorSettlementSettled = signal(false);
  readonly vendorSettlementError = signal('');
  readonly vendorSettlementSuccess = signal('');
  readonly vendorSettlementForm = this.formBuilder.group({
    vendorId: ['', Validators.required],
    bankAccountId: ['', Validators.required],
    settlementDate: [this.todayDate(), Validators.required],
    remarks: ['', Validators.maxLength(1000)],
  });
  readonly rcSections = RC_SECTIONS;
  readonly quoteForm = this.formBuilder.group({
    insuranceCompanyId: ['', Validators.required],
    vendorId: [''],
    // IDV is optional in the API contract (zero is also a valid value).
    idv: [0, [Validators.min(0)]],
    premium: [0, [Validators.required, Validators.min(0.01)]],
    companyPayable: [0, [Validators.required, Validators.min(0)]],
    agentPoints: [0, [Validators.required, Validators.min(0)]],
    adminProfit: [0, [Validators.required, Validators.min(0)]],
    agentClassCommissionApplicable: [false],
    remarks: [''],
  });
  readonly policyForm = this.formBuilder.group({
    policyNumber: ['', [Validators.required, Validators.maxLength(100)]],
    policyStartDate: ['', Validators.required],
    policyEndDate: ['', Validators.required],
    remarks: ['', Validators.maxLength(1000)],
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('enquiryId') ?? '';
      this.enquiryId.set(id);
      if (id) {
        this.load(id);
        this.loadQuoteOptions();
      }
      else this.error.set('An enquiry ID is required to view this page.');
    });
  }

  private loadQuoteOptions(): void {
    this.service.getInsuranceCompanies().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => this.companies.set(response?.isSuccess ? response.data ?? [] : []),
      error: () => this.companies.set([]),
    });
    this.service.getVendors().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => this.vendors.set(response?.isSuccess ? (response.data ?? []).filter((vendor) => vendor.isActive) : []),
      error: () => this.vendors.set([]),
    });
    this.bankAccountsLoading.set(true);
    this.bankAccountService.getBankAccounts({ pageNumber: 1, pageSize: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.bankAccountsLoading.set(false);
        this.bankAccounts.set(response?.isSuccess ? (response.data?.items ?? []).filter((account) => account.isActive) : []);
      },
      error: () => {
        this.bankAccountsLoading.set(false);
        this.bankAccounts.set([]);
      },
    });
  }

  openQuoteModal(): void {
    this.quoteError.set('');
    this.quoteSuccess.set('');
    this.quoteForm.reset({
      insuranceCompanyId: '', vendorId: '', idv: 0, premium: 0,
      companyPayable: 0, agentPoints: 0, adminProfit: 0,
      agentClassCommissionApplicable: false, remarks: '',
    });
    this.quoteModalOpen.set(true);
  }

  closeQuoteModal(): void {
    if (!this.quoteSubmitting()) this.quoteModalOpen.set(false);
  }

  nextEnquiryStatus(): string | null {
    const enquiry = this.enquiry();
    const status = this.canonicalStatus(enquiry?.status);
    const next: Record<string, string> = {
      Submitted: 'QuoteInProgress',
      QuoteInProgress: 'Quoted',
      PolicyInProgress: 'PolicyIssued',
    };
    return next[status] ?? null;
  }

  canUpdateStatus(): boolean {
    const nextStatus = this.nextEnquiryStatus();
    if (!nextStatus) return false;
    if (nextStatus === 'PolicyIssued') {
      const enquiry = this.enquiry();
      return !!enquiry && this.policyDocuments(enquiry).length > 0 && !!this.policyDetails() && this.vendorSettlementSettled();
    }
    return true;
  }

  selectTab(tab: 'vehicle' | 'payment' | 'documents' | 'quotes' | 'vendor' | 'policy'): void {
    if (['payment', 'vendor', 'policy'].includes(tab) && !this.isPolicyStage()) return;
    this.activeTab.set(tab);
    if (tab === 'vendor') this.loadVendorSettlementStatus();
  }

  loadVendorSettlementStatus(): void {
    const id = this.enquiryId();
    if (!id || this.vendorSettlementLoading()) return;
    this.vendorSettlementLoading.set(true);
    this.service.getVendorSettlementStatus(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.vendorSettlementLoading.set(false);
        this.vendorSettlementSettled.set(response?.isSuccess && response.data === true);
        if (this.vendorSettlementSettled()) this.vendorSettlementForm.disable();
      },
      error: () => this.vendorSettlementLoading.set(false),
    });
  }

  submitVendorSettlement(): void {
    this.vendorSettlementForm.markAllAsTouched();
    if (this.vendorSettlementForm.invalid || this.vendorSettlementSubmitting() || this.vendorSettlementSettled()) return;
    const enquiry = this.enquiry();
    const vendorId = this.vendorSettlementForm.controls.vendorId.value;
    if (!enquiry || !vendorId) return;
    this.vendorSettlementSubmitting.set(true);
    this.vendorSettlementError.set('');
    this.vendorSettlementSuccess.set('');
    this.service.submitVendorSettlement({
      enquiryId: enquiry.id,
      vendorId,
      settlementMethod: 2,
      bankAccountId: this.vendorSettlementForm.controls.bankAccountId.value || null,
      settlementDate: this.vendorSettlementForm.controls.settlementDate.value || this.todayDate(),
      remarks: this.vendorSettlementForm.controls.remarks.value?.trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.vendorSettlementSubmitting.set(false);
        if (!response?.isSuccess || response.data !== true) {
          this.vendorSettlementError.set(response?.message || 'Vendor settlement could not be recorded.');
          return;
        }
        this.vendorSettlementSettled.set(true);
        this.vendorSettlementForm.disable();
        this.vendorSettlementSuccess.set(response.message || 'Vendor settlement recorded.');
      },
      error: (err) => {
        this.vendorSettlementSubmitting.set(false);
        this.vendorSettlementError.set(err?.error?.message || 'Vendor settlement could not be recorded.');
      },
    });
  }

  isPolicyStage(status = this.enquiry()?.status): boolean {
    const canonical = this.canonicalStatus(status);
    return canonical === 'PolicyInProgress' || canonical === 'PolicyIssued';
  }

  selectedQuote(quotes: AdminEnquiryDetails['quotes']): AdminEnquiryDetails['quotes'][number] | null {
    return quotes.find((quote) => quote.isSelected === true) ?? null;
  }

  policyDocuments(item: AdminEnquiryDetails): AdminEnquiryDetails['documents'] {
    return item.documents.filter((document) => `${document.docName ?? ''} ${document.docType ?? ''}`.toLowerCase().includes('policy'));
  }

  openStatusModal(): void {
    if (!this.canUpdateStatus() || this.statusSubmitting()) return;
    this.statusError.set('');
    this.statusModalOpen.set(true);
  }

  canCancelEnquiry(): boolean {
    const status = this.canonicalStatus(this.enquiry()?.status);
    return !!status && status !== 'PolicyIssued' && status !== 'Cancelled';
  }

  openCancellationModal(): void {
    if (!this.canCancelEnquiry() || this.statusSubmitting()) return;
    this.cancellationReason.set('');
    this.statusError.set('');
    this.cancellationPayment.set(null);
    this.cancellationPaymentError.set('');
    this.refundBankAccountId.set('');
    this.cancellationModalOpen.set(true);
    const id = this.enquiry()?.id;
    if (!id) return;
    this.cancellationPaymentLoading.set(true);
    this.service.getAdminPolicyPaymentDetails(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.cancellationPaymentLoading.set(false);
        if (response?.isSuccess && response.data?.paymentStatus?.toLowerCase() === 'approved') {
          this.cancellationPayment.set(response.data);
        }
      },
      error: (err) => {
        this.cancellationPaymentLoading.set(false);
        if (err?.status !== 404) this.cancellationPaymentError.set(err?.error?.message || 'Could not check payment status. Retry before cancelling.');
      },
    });
  }

  cancelEnquiry(): void {
    const enquiry = this.enquiry();
    const reason = this.cancellationReason().trim();
    if (!enquiry || reason.length < 5 || this.statusSubmitting() || this.cancellationPaymentLoading() || this.cancellationPaymentError()) return;
    const refundBankAccountId = this.refundBankAccountId();
    if (this.cancellationPayment() && !refundBankAccountId) return;
    this.statusSubmitting.set(true);
    this.statusError.set('');
    this.service.changeAdminEnquiryStatus({
      enquiryId: enquiry.id,
      currentStatus: String(enquiry.status),
      newStatus: 'Cancelled',
      cancellationReason: reason,
      refundBankAccountId: refundBankAccountId || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.statusSubmitting.set(false);
        if (!response?.isSuccess) {
          this.statusError.set(response?.message || 'The enquiry could not be cancelled.');
          return;
        }
        this.cancellationModalOpen.set(false);
        this.statusSuccess.set(response.message || 'Enquiry cancelled.');
        this.load();
      },
      error: (err) => {
        this.statusSubmitting.set(false);
        this.statusError.set(err?.error?.message || 'The enquiry could not be cancelled.');
      },
    });
  }

  closeStatusModal(): void {
    if (!this.statusSubmitting()) this.statusModalOpen.set(false);
  }

  confirmStatusUpdate(): void {
    const enquiry = this.enquiry();
    const nextStatus = this.nextEnquiryStatus();
    if (!enquiry || !nextStatus || !this.canUpdateStatus() || this.statusSubmitting()) return;
    this.statusSubmitting.set(true);
    this.statusError.set('');
    this.service.changeAdminEnquiryStatus({
      enquiryId: enquiry.id,
      currentStatus: String(enquiry.status),
      newStatus: nextStatus,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.statusSubmitting.set(false);
        if (!response?.isSuccess) {
          this.statusError.set(response?.message || 'The enquiry status could not be updated.');
          return;
        }
        this.statusModalOpen.set(false);
        this.statusSuccess.set(response.message || `Status updated to ${this.statusLabel(nextStatus)}.`);
        this.load();
        window.setTimeout(() => this.statusSuccess.set(''), 4500);
      },
      error: (err) => {
        this.statusSubmitting.set(false);
        this.statusError.set(err?.error?.message || 'The enquiry status could not be updated. Please try again.');
      },
    });
  }

  private canonicalStatus(status: string | number | null | undefined): string {
    const value = String(status ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
    const canonical: Record<string, string> = {
      '1': 'Created', created: 'Created',
      '2': 'Submitted', submitted: 'Submitted',
      '3': 'QuoteInProgress', quoteinprogress: 'QuoteInProgress',
      '4': 'Quoted', quoted: 'Quoted',
      '5': 'PaymentVerificationPending', paymentverificationpending: 'PaymentVerificationPending',
      '6': 'PolicyInProgress', policyinprogress: 'PolicyInProgress',
      '7': 'PolicyIssued', policyissued: 'PolicyIssued',
      '8': 'Cancelled', cancelled: 'Cancelled',
    };
    return canonical[value] ?? '';
  }

  submitQuote(): void {
    this.quoteForm.markAllAsTouched();
    if (this.quoteSubmitting()) return;
    if (!this.enquiryId()) {
      this.quoteError.set('The enquiry could not be identified. Refresh the page and try again.');
      return;
    }
    if (this.quoteForm.invalid) {
      this.quoteError.set('Check the highlighted fields. Select an insurance company, enter a premium greater than zero, and use valid amounts.');
      return;
    }
    const value = this.quoteForm.getRawValue();
    this.quoteSubmitting.set(true);
    this.quoteError.set('');
    this.service.addVehicleQuote({
      enquiryId: this.enquiryId(),
      insuranceCompanyId: value.insuranceCompanyId ?? '',
      vendorId: value.vendorId || null,
      idv: Number(value.idv),
      premium: Number(value.premium),
      companyPayable: Number(value.companyPayable),
      agentPoints: Number(value.agentPoints),
      adminProfit: Number(value.adminProfit),
      agentClassCommissionApplicable: value.agentClassCommissionApplicable === true,
      remarks: value.remarks?.trim() ?? '',
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.quoteSubmitting.set(false);
        if (!response?.isSuccess) {
          this.quoteError.set(response?.message || 'The quote could not be added.');
          return;
        }
        this.quoteModalOpen.set(false);
        this.quoteSuccess.set(response.message || 'Quote added successfully.');
        this.load();
        window.setTimeout(() => this.quoteSuccess.set(''), 3500);
      },
      error: (err) => {
        this.quoteSubmitting.set(false);
        const apiErrors = err?.error?.errors;
        const validationDetails = Array.isArray(apiErrors)
          ? apiErrors.filter((message: unknown) => typeof message === 'string').join(' ')
          : apiErrors && typeof apiErrors === 'object'
            ? Object.values(apiErrors).flat().filter((message): message is string => typeof message === 'string').join(' ')
            : '';
        this.quoteError.set(err?.error?.message || validationDetails || err?.message || 'The quote could not be added. Please try again.');
      },
    });
  }

  load(id = this.enquiryId()): void {
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    this.service.getAdminEnquiryDetails(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response?.isSuccess && response.data) {
          this.enquiry.set(response.data);
          const selectedVendorId = this.selectedQuote(response.data.quotes)?.vendorId ?? '';
          if (selectedVendorId && !this.vendorSettlementSettled()) this.vendorSettlementForm.patchValue({ vendorId: selectedVendorId });
          this.loadVendorSettlementStatus();
          if (!this.isPolicyStage(response.data.status) && ['payment', 'vendor', 'policy'].includes(this.activeTab())) {
            this.activeTab.set('vehicle');
          }
          this.loadPolicyDetails(response.data.id);
          this.paymentDetails.set(null);
          this.paymentSectionError.set('');
          this.paymentVerificationError.set('');
          this.paymentReviewAvailable.set(false);
          this.verifiedPaymentId.set(null);
          this.paymentModalOpen.set(false);
          if (this.isPaymentDetailsVisible(response.data.status)) {
            this.loadPaymentDetails(response.data.id);
          }
          if (this.shouldCheckPaymentVerification(response.data.status)) {
            this.checkForPendingPayment(response.data);
          }
        }
        else {
          this.enquiry.set(null);
          this.error.set(response?.message || 'The enquiry details could not be loaded.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.enquiry.set(null);
        this.error.set(err?.error?.message || 'The enquiry details could not be loaded.');
      },
    });
  }

  loadPolicyDetails(enquiryId = this.enquiryId()): void {
    if (!enquiryId) return;
    this.policyLoading.set(true);
    this.policyLoadError.set('');
    this.service.getAdminPolicyDetails(enquiryId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.policyLoading.set(false);
        if (response?.isSuccess && response.data) {
          this.policyDetails.set(response.data);
          this.policyForm.patchValue({
            policyNumber: response.data.policyNumber,
            policyStartDate: response.data.policyStartDate?.slice(0, 10),
            policyEndDate: response.data.policyEndDate?.slice(0, 10),
            remarks: response.data.remarks ?? '',
          });
          return;
        }
        this.policyDetails.set(null);
        if (response?.statusCode && response.statusCode !== 404) {
          this.policyLoadError.set(response.message || 'Could not load policy details.');
        }
      },
      error: (err) => {
        this.policyLoading.set(false);
        this.policyDetails.set(null);
        if (err?.status !== 404) this.policyLoadError.set(err?.error?.message || 'Could not load policy details.');
      },
    });
  }

  savePolicyDetails(): void {
    this.policyForm.markAllAsTouched();
    if (this.policySaving() || this.policyForm.invalid || this.policyDetails()) return;
    const enquiry = this.enquiry();
    if (!enquiry || this.policyDocuments(enquiry).length === 0) {
      this.policyError.set('Upload the final Policy document before saving policy details.');
      return;
    }
    const value = this.policyForm.getRawValue();
    if (!value.policyStartDate || !value.policyEndDate || value.policyEndDate <= value.policyStartDate) {
      this.policyError.set('Policy end date must be after policy start date.');
      return;
    }
    this.policySaving.set(true);
    this.policyError.set('');
    this.policySuccess.set('');
    this.service.createAdminPolicyDetails(this.enquiryId(), {
      policyNumber: value.policyNumber?.trim() ?? '',
      policyStartDate: value.policyStartDate,
      policyEndDate: value.policyEndDate,
      remarks: value.remarks?.trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.policySaving.set(false);
        if (!response?.isSuccess || !response.data) {
          this.policyError.set(response?.message || 'Policy details could not be saved.');
          return;
        }
        this.policyDetails.set(response.data);
        this.policySuccess.set(response.message || 'Policy details saved.');
        this.load();
        if (this.vendorSettlementSettled() && this.enquiry() && this.policyDocuments(this.enquiry()!).length > 0) {
          this.openStatusModal();
        }
      },
      error: (err) => {
        this.policySaving.set(false);
        this.policyError.set(err?.error?.message || 'Policy details could not be saved.');
      },
    });
  }

  onPolicyFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.policyFile.set(input.files?.[0] ?? null);
    this.policyUploadError.set('');
    this.policyUploadSuccess.set('');
  }

  uploadFinalPolicy(): void {
    const file = this.policyFile();
    if (!file || this.policyUploading()) {
      if (!file) this.policyUploadError.set('Choose the final policy file first.');
      return;
    }
    const payload: UploadDocPayload = { enquiryId: this.enquiryId(), docType: 'Policy', docSide: 'Front', file };
    this.policyUploading.set(true);
    this.policyUploadError.set('');
    this.policyUploadSuccess.set('');
    this.service.uploadDocument(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.policyUploading.set(false);
        if (!response?.isSuccess) {
          this.policyUploadError.set(response?.message || 'Policy document could not be uploaded.');
          return;
        }
        this.policyFile.set(null);
        this.policyUploadSuccess.set(response.message || 'Policy document uploaded.');
        this.load();
      },
      error: (err) => {
        this.policyUploading.set(false);
        this.policyUploadError.set(err?.error?.message || 'Policy document could not be uploaded.');
      },
    });
  }

  private checkForPendingPayment(enquiry: AdminEnquiryDetails): void {
    if (!this.shouldCheckPaymentVerification(enquiry.status)) return;
    this.paymentReviewAvailable.set(false);
    this.paymentModalOpen.set(false);
    this.verifiedPaymentId.set(null);
    this.paymentLoading.set(true);
    this.paymentError.set('');
    this.paymentVerificationError.set('');
    this.service.getPaymentVerification(enquiry.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (verification) => {
        this.paymentLoading.set(false);
        if (!verification?.isSuccess || !verification.data) {
          this.paymentVerificationError.set(verification?.message || 'Could not verify the current payment status.');
          return;
        }
        if (String(verification.data.paymentStatus).trim().toLowerCase() !== 'pending') {
          return;
        }
        this.verifiedPaymentId.set(verification.data.policyPaymentId);
        const details = this.paymentDetails();
        if (details && details.policyPaymentId !== verification.data.policyPaymentId) {
          this.paymentVerificationError.set('The payment detail record does not match the pending verification. Refresh and try again.');
          return;
        }
        this.paymentReviewAvailable.set(true);
        this.paymentModalOpen.set(true);
      },
      error: (err) => {
        this.paymentLoading.set(false);
        this.paymentVerificationError.set(err?.error?.message || 'Could not check the payment status.');
      },
    });
  }

  private loadPaymentDetails(enquiryId: string): void {
    this.paymentSectionLoading.set(true);
    this.paymentSectionError.set('');
    this.service.getAdminPolicyPaymentDetails(enquiryId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.paymentSectionLoading.set(false);
        if (response?.isSuccess && response.data) {
          if (this.verifiedPaymentId() && response.data.policyPaymentId !== this.verifiedPaymentId()) {
            this.paymentReviewAvailable.set(false);
            this.paymentModalOpen.set(false);
            this.paymentVerificationError.set('The payment detail record does not match the pending verification. Refresh and try again.');
          }
          this.paymentDetails.set(response.data);
        }
        else {
          this.paymentDetails.set(null);
          this.paymentSectionError.set(response?.message || 'Could not load payment details.');
        }
      },
      error: (err) => {
        this.paymentSectionLoading.set(false);
        this.paymentDetails.set(null);
        this.paymentSectionError.set(err?.error?.message || 'Could not load payment details.');
      },
    });
  }

  isPaymentDetailsVisible(status: string | number | null | undefined): boolean {
    const key = String(status ?? '').toLowerCase().replace(/[\s_-]/g, '');
    return ['5', '6', '7', 'paymentverificationpending', 'policyinprogress', 'policyissued'].includes(key);
  }

  isPaymentVerificationPending(status: string | number | null | undefined): boolean {
    const key = String(status ?? '').toLowerCase().replace(/[\s_-]/g, '');
    return key === '5' || key === 'paymentverificationpending';
  }

  private shouldCheckPaymentVerification(status: string | number | null | undefined): boolean {
    const key = String(status ?? '').toLowerCase().replace(/[\s_-]/g, '');
    return this.isPaymentVerificationPending(status) || key === '6' || key === 'policyinprogress';
  }

  openPaymentReview(): void {
    if (!this.paymentReviewAvailable() || !this.paymentDetails()) return;
    this.paymentError.set('');
    this.paymentConfirmation.set(null);
    this.paymentModalOpen.set(true);
  }

  togglePaymentSection(): void {
    this.paymentSectionExpanded.update((expanded) => !expanded);
  }

  retryPaymentDetails(): void {
    const id = this.enquiryId();
    if (id) this.loadPaymentDetails(id);
  }

  retryPaymentReview(): void {
    const enquiry = this.enquiry();
    if (enquiry) {
      if (this.isPaymentDetailsVisible(enquiry.status)) this.loadPaymentDetails(enquiry.id);
      this.checkForPendingPayment(enquiry);
    }
  }

  requestPaymentConfirmation(action: 'approve' | 'reject'): void {
    this.paymentActionRemarks.set('');
    this.paymentError.set('');
    this.paymentConfirmation.set(action);
  }

  cancelPaymentConfirmation(): void {
    if (!this.paymentSubmitting()) this.paymentConfirmation.set(null);
  }

  confirmPaymentAction(): void {
    const details = this.paymentDetails();
    const action = this.paymentConfirmation();
    if (!details || !action || this.paymentSubmitting()) return;
    const remarks = this.paymentActionRemarks().trim();
    if (action === 'reject' && !remarks) {
      this.paymentError.set('Enter a reason before rejecting this payment.');
      return;
    }
    this.paymentSubmitting.set(true);
    this.paymentError.set('');
    const request = action === 'approve'
      ? this.service.approvePolicyPayment(details.policyPaymentId, remarks || 'Approved')
      : this.service.rejectPolicyPayment(details.policyPaymentId, remarks);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.paymentSubmitting.set(false);
        if (!response?.isSuccess) {
          this.paymentError.set(response?.message || `Could not ${action} this payment.`);
          return;
        }
        const label = action === 'approve' ? 'approved' : 'rejected';
        this.paymentModalOpen.set(false);
        this.paymentReviewAvailable.set(false);
        this.paymentConfirmation.set(null);
        this.paymentNotice.set(`Payment ${label} successfully.`);
        this.load();
        window.setTimeout(() => this.paymentNotice.set(''), 5000);
      },
      error: (err) => {
        this.paymentSubmitting.set(false);
        this.paymentError.set(err?.error?.message || `Could not ${action} this payment.`);
      },
    });
  }

  goBack(): void { this.router.navigate(['/admin/enquiries']); }

  copy(value: unknown, label: string): void {
    const text = value == null ? '' : String(value);
    if (!text || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(label);
      window.setTimeout(() => this.copied.set(''), 1800);
    }).catch(() => this.copied.set(''));
  }

  fieldsFor(section: typeof RC_SECTIONS[number], rc: AdminEnquiryRcDetails | null | undefined): DetailField[] {
    if (!rc) return [];
    return section.fields.map(([key, label]) => ({ label, value: this.display(rc[key]) }))
      .filter((field) => field.value !== '—');
  }

  statusLabel(status: string | number | null | undefined): string {
    const labels: Record<string, string> = {
      '1': 'Created', '2': 'Submitted', '3': 'Quote in progress', '4': 'Quoted',
      '5': 'Payment verification pending', '6': 'Policy in progress', '7': 'Policy issued', '8': 'Cancelled',
      Created: 'Created', Submitted: 'Submitted', QuoteInProgress: 'Quote in progress', Quoted: 'Quoted',
      PaymentVerificationPending: 'Payment verification pending', PolicyInProgress: 'Policy in progress',
      PolicyIssued: 'Policy issued', Cancelled: 'Cancelled',
    };
    const key = String(status ?? '');
    return labels[key] ?? (key.replace(/([a-z])([A-Z])/g, '$1 $2') || '—');
  }

  documentUrl(url: string): string {
    if (!url) return '';
    if (/^(https?:|blob:|data:)/i.test(url)) return url;
    const base = (environment.r2Url || '').replace(/\/+$/, '');
    return base ? `${base}/${url.replace(/^\/+/, '')}` : url;
  }

  todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  display(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(date);
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}
