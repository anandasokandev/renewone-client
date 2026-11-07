import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap, map, of, catchError, forkJoin } from 'rxjs';
import { AccountService, AgentLookupItem } from '../../../services/account/account.service';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { AdminAssistedEnquiryItem, CreateVehicleEnquiryPayload, DocumentSide, DocumentType, InsuranceTypeItem, QuoteItem, SubmitVehicleEnquiryPayload, VehicleDocumentApiItem, VehicleTypeItem, PolicyQrDetailsData, LedgerPaymentDetailsData, PolicySummaryData } from '../../../models/enquiry.model';
import { environment } from '../../../../environments/environment';

interface CreatedEnquiryDetails {
  enquiryId?: string;
  enquiryNumber?: string;
  accountId?: string;
  status?: string | number;
  policyType?: string;
  selectedQuoteId?: string;
  policyRequestId?: string;
  currentStep?: string | number | null;
  [key: string]: unknown;
}

interface AdminUploadedDocument {
  id: string;
  docType: DocumentType;
  docSide: DocumentSide;
  fileName: string;
  url: string;
  isLocalPreview?: boolean;
}

interface DocumentCategory {
  type: DocumentType;
  title: string;
  description: string;
  required: boolean;
}

@Component({
  selector: 'app-admin-enquiry-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-enquiry-creation.html',
  styleUrl: './admin-enquiry-creation.css',
})
export class AdminEnquiryCreation implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly enquiryService = inject(EnquiryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly agentSearch$ = new Subject<string>();

  readonly step = signal<'details' | 'documents' | 'quote' | 'payment' | 'review'>('details');
  readonly agentSearch = signal('');
  readonly agents = signal<AgentLookupItem[]>([]);
  readonly selectedAgent = signal<AgentLookupItem | null>(null);
  readonly isAgentLoading = signal(false);
  readonly agentError = signal<string | null>(null);
  readonly insuranceSearch = signal('');
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly selectedInsuranceTypeId = signal('');
  readonly isInsuranceLoading = signal(false);
  readonly insuranceError = signal<string | null>(null);
  readonly vehicleSearch = signal('');
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);
  readonly selectedVehicleTypeId = signal('');
  readonly isVehicleLoading = signal(false);
  readonly vehicleError = signal<string | null>(null);
  readonly customerName = signal('');
  readonly customerNumber = signal('');
  readonly vehicleNumber = signal('');
  readonly policyType = signal<'Comprehensive' | 'ThirdParty' | 'OwnDamage'>('Comprehensive');
  readonly isRCOwnerChanged = signal(false);
  readonly hasPreviousClaim = signal(false);
  readonly ncbPercentage = signal<number | null>(20);
  readonly attemptedSubmit = signal(false);
  readonly isSubmitting = signal(false);
  readonly isSubmittingEnquiry = signal(false);
  readonly formError = signal<string | null>(null);
  readonly createdEnquiry = signal<CreatedEnquiryDetails | null>(null);
  readonly uploadedDocuments = signal<AdminUploadedDocument[]>([]);
  readonly isDocumentsLoading = signal(false);
  readonly documentsError = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly submitEnquiryError = signal<string | null>(null);
  readonly uploadCount = signal(0);
  readonly deletingDocumentId = signal<string | null>(null);
  readonly replacingDocumentId = signal<string | null>(null);
  readonly previewDocument = signal<AdminUploadedDocument | null>(null);
  readonly existingEnquiryStep = signal<string | number | null>(null);
  readonly adminAssistedEnquiries = signal<AdminAssistedEnquiryItem[]>([]);
  readonly isAdminEnquiriesLoading = signal(false);
  readonly adminEnquiriesError = signal<string | null>(null);
  readonly quotes = signal<QuoteItem[]>([]);
  readonly vendors = signal<Array<{ id: string; name: string; isActive: boolean }>>([]);
  readonly insuranceCompanies = signal<Array<{ id: string; companyName: string }>>([]);
  readonly quoteLoading = signal(false);
  readonly quoteSaving = signal(false);
  readonly quoteError = signal<string | null>(null);
  readonly quoteSuccess = signal<string | null>(null);
  readonly quoteForm = { insuranceCompanyId: '', vendorId: '', premium: null as number | null,
    companyPayable: null as number | null, agentPoints: null as number | null,
    adminProfit: null as number | null, idv: null as number | null, remarks: '',
    agentClassCommissionApplicable: false };
  readonly agentClassCommissionRate = computed(() => {
    const accountId = this.createdEnquiry()?.accountId;
    const currentAgent = this.agents().find(agent => agent.accountId === accountId)
      ?? (this.selectedAgent()?.accountId === accountId ? this.selectedAgent() : null);
    return currentAgent?.commissionPercentage ?? null;
  });
  get agentClassCommissionDeductionPreview(): number {
    const amount = this.quoteForm.agentPoints;
    const rate = this.agentClassCommissionRate();
    return this.quoteForm.agentClassCommissionApplicable && amount != null && rate != null
      ? Math.round((amount * rate / 100 + Number.EPSILON) * 100) / 100
      : 0;
  }
  get netAgentCommissionPreview(): number | null {
    return this.quoteForm.agentPoints == null
      ? null
      : Math.max(0, this.quoteForm.agentPoints - this.agentClassCommissionDeductionPreview);
  }
  get adjustedAdminProfitPreview(): number | null {
    return this.quoteForm.adminProfit == null
      ? null
      : this.quoteForm.adminProfit + this.agentClassCommissionDeductionPreview;
  }
  readonly selectedQuoteId = signal<string | null>(null);
  readonly isSubmittingQuote = signal(false);
  readonly quoteSubmitError = signal<string | null>(null);
  readonly workflowNotice = signal<string | null>(null);
  readonly paymentMode = signal<'bank' | 'ledger'>('bank');
  readonly qrDetails = signal<PolicyQrDetailsData | null>(null);
  readonly ledgerDetails = signal<LedgerPaymentDetailsData | null>(null);
  readonly selectedPolicySummary = signal<PolicySummaryData | null>(null);
  readonly qrLoading = signal(false);
  readonly ledgerLoading = signal(false);
  readonly paymentSubmitting = signal(false);
  readonly paymentError = signal<string | null>(null);
  readonly transactionId = signal('');
  readonly paymentRemarks = signal('');
  readonly policyRequestId = signal<string | null>(null);
  readonly agentPayable = computed(() => this.selectedPolicySummary()?.agentPayable ?? null);
  private qrLoadedForEnquiry: string | null = null;
  private ledgerLoadedForEnquiry: string | null = null;
  readonly documentCategories: DocumentCategory[] = [
    { type: 'RC', title: 'RC documents', description: 'Registration certificate images.', required: true },
    { type: 'Identity', title: 'ID proof', description: 'Customer identity document images.', required: true },
    { type: 'PreviousPolicy', title: 'Previous policy', description: 'Previous policy images, if available.', required: false },
    { type: 'VehicleImage', title: 'Vehicle images', description: 'Photos of the insured vehicle, if available.', required: false },
  ];
  readonly activeNcbOptions = [0, 20, 25, 35, 45, 50];

  readonly selectedInsuranceType = computed(() =>
    this.insuranceTypes().find(type => type.id === this.selectedInsuranceTypeId()) ?? null
  );
  readonly isVehicleInsurance = computed(() =>
    this.selectedInsuranceType()?.name.trim().toLowerCase() === 'vehicle insurance'
  );
  readonly isThirdPartyPolicy = computed(() => this.policyType() === 'ThirdParty');
  readonly visibleAgents = computed(() => this.agents());
  readonly visibleInsuranceTypes = computed(() => {
    const query = this.insuranceSearch().trim().toLowerCase();
    return this.insuranceTypes().filter(type => type.name.toLowerCase().includes(query));
  });
  readonly visibleVehicleTypes = computed(() => {
    const query = this.vehicleSearch().trim().toLowerCase();
    return this.vehicleTypes().filter(type => type.typeName.toLowerCase().includes(query));
  });

  constructor() {
    this.agentSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        this.isAgentLoading.set(true);
        this.agentError.set(null);
        return this.accountService.getAgentLookup(search).pipe(
          map(response => ({ response, error: null as string | null })),
          catchError(error => of({ response: null, error: error?.error?.message || 'Unable to load agents.' })),
          finalize(() => this.isAgentLoading.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ response, error }) => {
      if (error) {
        this.agentError.set(error);
        this.agents.set([]);
      } else if (response?.isSuccess && response.data?.items) {
        this.agents.set(response.data.items.filter(agent => agent.isActive !== false && agent.status?.toLowerCase() !== 'inactive'));
      } else {
        this.agents.set([]);
        this.agentError.set(response?.message || 'Unable to load agents.');
      }
    });
  }

  ngOnInit(): void {
    this.loadAgents('');
    this.loadInsuranceTypes();
    this.loadAdminAssistedEnquiries();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const requestedStep = params.get('step');
      if (requestedStep === 'documents' || requestedStep === 'quote' || requestedStep === 'payment' || requestedStep === 'review') {
        this.step.set(requestedStep);
        const enquiryId = params.get('enquiryId');
        try {
          const cached = sessionStorage.getItem('admin-created-enquiry');
          if (cached) {
            const cachedEnquiry = JSON.parse(cached) as CreatedEnquiryDetails;
            if (!enquiryId || cachedEnquiry.enquiryId === enquiryId) this.createdEnquiry.set(cachedEnquiry);
          }
        } catch {
          this.createdEnquiry.set(null);
        }
        const selectedId = enquiryId || this.createdEnquiry()?.enquiryId;
        if (selectedId) {
          this.createdEnquiry.update(current => ({ ...(current || {}), enquiryId: selectedId }));
          if (requestedStep === 'documents') this.loadDocuments(selectedId);
          if (requestedStep === 'quote') {
            this.selectedQuoteId.set(this.createdEnquiry()?.selectedQuoteId || null);
            this.loadQuoteStep(selectedId);
          }
          if (requestedStep === 'payment' || requestedStep === 'review') {
            this.selectedQuoteId.set(this.createdEnquiry()?.selectedQuoteId || null);
            this.policyRequestId.set(this.createdEnquiry()?.policyRequestId || null);
            this.loadPolicySummary(selectedId);
            if (requestedStep === 'payment') this.loadQrDetails(selectedId);
          }
        }
      }
    });
  }

  loadAgents(search: string): void {
    this.agentSearch.set(search);
    this.agentSearch$.next(search);
  }

  loadAdminAssistedEnquiries(): void {
    this.isAdminEnquiriesLoading.set(true);
    this.adminEnquiriesError.set(null);
    this.enquiryService.getAdminAssistedEnquiries({ pageNumber: 1, pageSize: 100, sortDescending: true }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isAdminEnquiriesLoading.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.adminEnquiriesError.set(response.message || 'Unable to load admin-created enquiries.');
          return;
        }
        this.adminAssistedEnquiries.set(response.data.items);
      },
      error: error => this.adminEnquiriesError.set(error?.error?.message || 'Unable to load admin-created enquiries.'),
    });
  }

  currentStageFor(currentStep: number | null): 'details' | 'documents' | 'quote' | 'payment' | 'review' {
    switch (currentStep) {
      case 2: return 'documents';
      case 3: return 'quote';
      case 4: return 'payment';
      case 6: return 'review';
      default: return 'details';
    }
  }

  openAdminAssistedEnquiry(item: AdminAssistedEnquiryItem): void {
    const target = this.currentStageFor(item.currentStep);
    const enquiry: CreatedEnquiryDetails = {
      ...item,
      enquiryId: item.id,
      enquiryNumber: item.enquiryNumber,
      accountId: item.accountId,
      policyType: String(item.policyType || 'Comprehensive'),
      selectedQuoteId: item.selectedQuoteId || undefined,
    };
    if (!enquiry.enquiryId || !enquiry.accountId) return;
    this.createdEnquiry.set(enquiry);
    sessionStorage.setItem('admin-created-enquiry', JSON.stringify(enquiry));
    this.step.set(target);
    const enquiryId = enquiry.enquiryId;
    this.router.navigate([], { relativeTo: this.route, queryParams: { step: target, enquiryId }, queryParamsHandling: 'merge' });
    if (target === 'documents') this.loadDocuments(enquiryId);
    if (target === 'quote') {
      this.selectedQuoteId.set(enquiry.selectedQuoteId || null);
      this.loadQuoteStep(enquiryId);
    }
    if (target === 'payment' || target === 'review') {
      this.selectedQuoteId.set(enquiry.selectedQuoteId || null);
      this.policyRequestId.set(enquiry.policyRequestId || null);
      this.loadPolicySummary(enquiryId);
      if (target === 'payment') this.loadQrDetails(enquiryId);
    }
  }

  chooseAgent(agent: AgentLookupItem): void {
    this.selectedAgent.set(agent);
    this.agentSearch.set(agent.agentName);
    this.agents.set([]);
    this.agentError.set(null);
  }

  clearAgent(): void {
    this.selectedAgent.set(null);
    this.agentSearch.set('');
    this.loadAgents('');
  }

  loadInsuranceTypes(): void {
    this.isInsuranceLoading.set(true);
    this.enquiryService.getInsuranceTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isInsuranceLoading.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess && response.data) this.insuranceTypes.set(response.data.filter(type => type.isActive));
        else this.insuranceError.set(response.message || 'Unable to load insurance types.');
      },
      error: error => this.insuranceError.set(error?.error?.message || 'Unable to load insurance types.'),
    });
  }

  selectInsuranceType(typeId: string): void {
    this.selectedInsuranceTypeId.set(typeId);
    this.selectedVehicleTypeId.set('');
    this.vehicleSearch.set('');
    this.vehicleTypes.set([]);
    this.vehicleError.set(null);
    this.formError.set(null);
    if (this.isVehicleInsurance()) this.loadVehicleTypes();
  }

  loadVehicleTypes(): void {
    this.isVehicleLoading.set(true);
    this.enquiryService.getVehicleTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isVehicleLoading.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess && response.data) this.vehicleTypes.set(response.data.filter(type => type.isActive));
        else this.vehicleError.set(response.message || 'Unable to load vehicle types.');
      },
      error: error => this.vehicleError.set(error?.error?.message || 'Unable to load vehicle types.'),
    });
  }

  selectPreviousClaim(hasClaim: boolean): void {
    this.hasPreviousClaim.set(hasClaim);
    this.ncbPercentage.set(hasClaim ? null : 20);
  }

  selectPolicyType(policy: 'Comprehensive' | 'ThirdParty' | 'OwnDamage'): void {
    this.policyType.set(policy);
    if (policy === 'ThirdParty') {
      this.hasPreviousClaim.set(false);
      this.ncbPercentage.set(null);
    } else if (this.ncbPercentage() === null) {
      this.ncbPercentage.set(20);
    }
  }

  setCustomerNumber(value: string): void {
    this.customerNumber.set(value.replace(/\D/g, '').slice(0, 10));
  }

  setVehicleNumber(value: string): void {
    this.vehicleNumber.set(value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 15));
  }

  get selectedVehicleType(): VehicleTypeItem | null {
    return this.vehicleTypes().find(type => type.id === this.selectedVehicleTypeId()) ?? null;
  }

  get canShowDetails(): boolean {
    return this.isVehicleInsurance() && !!this.selectedVehicleTypeId();
  }

  get hasValidPhone(): boolean {
    return /^[0-9]{10}$/.test(this.customerNumber());
  }

  get hasValidVehicleNumber(): boolean {
    return /^[A-Z0-9 -]{4,15}$/.test(this.vehicleNumber());
  }

  get isValid(): boolean {
    return !!this.selectedAgent()?.accountId && !!this.selectedInsuranceTypeId() && !!this.selectedVehicleTypeId() &&
      this.customerName().trim().length >= 2 && /^[0-9]{10}$/.test(this.customerNumber()) &&
      /^[A-Z0-9 -]{4,15}$/.test(this.vehicleNumber());
  }

  proceed(): void {
    this.attemptedSubmit.set(true);
    this.formError.set(null);
    if (!this.isValid || this.isSubmitting()) return;
    const accountId = this.selectedAgent()!.accountId;
    const payload: CreateVehicleEnquiryPayload = {
      accountId,
      AccountId: accountId,
      insuranceTypeId: this.selectedInsuranceTypeId(),
      vehicleTypeId: this.selectedVehicleTypeId(),
      customerName: this.customerName().trim(),
      customerNumber: this.customerNumber(),
      vehicleNumber: this.vehicleNumber(),
      miPolicyType: this.policyType(),
      isRCOwnerChanged: this.isRCOwnerChanged(),
      hasPreviousClaim: this.hasPreviousClaim(),
      ncbPercentage: this.isThirdPartyPolicy() ? 0 : (this.hasPreviousClaim() ? null : this.ncbPercentage()),
      priority: 1,
      submissionMode: 1,
    };
    this.isSubmitting.set(true);
    this.enquiryService.createVehicleEnquiry(payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.formError.set(response.message || 'Unable to create the enquiry.');
          return;
        }
        const result = response.data as CreatedEnquiryDetails;
        const created = { ...result, accountId, policyType: this.policyType() };
        this.createdEnquiry.set(created);
        sessionStorage.setItem('admin-created-enquiry', JSON.stringify(created));
        if (result.currentStep !== null && result.currentStep !== undefined) {
          this.existingEnquiryStep.set(result.currentStep);
          return;
        }
        this.step.set('documents');
        this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'documents', enquiryId: result.enquiryId }, queryParamsHandling: 'merge' });
      },
      error: error => this.formError.set(error?.error?.message || 'Unable to create the enquiry.'),
    });
  }

  backToQueue(): void {
    this.router.navigate(['/admin/enquiries']);
  }

  proceedToExistingEnquiry(): void {
    const value = String(this.existingEnquiryStep() ?? '').trim().toLowerCase();
    const numericStep = Number(value.replace(/^step\s*/, ''));
    const namedSteps: Record<string, 'details' | 'documents' | 'quote' | 'payment' | 'review'> = {
      details: 'details', enquiry: 'details', documents: 'documents', document: 'documents',
      quote: 'quote', quoting: 'quote', payment: 'payment', review: 'review',
    };
    const target = numericStep === 2 ? 'documents'
      : numericStep === 3 ? 'quote'
      : numericStep === 4 ? 'payment'
      : numericStep === 5 ? 'review'
      : numericStep === 1 ? 'details'
      : namedSteps[value] || namedSteps[value.replace(/^step\s*/, '')];
    if (!target) return;
    this.existingEnquiryStep.set(null);
    this.step.set(target);
    const enquiryId = this.createdEnquiry()?.enquiryId;
    if (!enquiryId) return;
    const params: Record<string, string> = { step: target, enquiryId };
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
    if (target === 'documents') this.loadDocuments(enquiryId);
    if (target === 'quote') {
      this.selectedQuoteId.set(this.createdEnquiry()?.selectedQuoteId || null);
      this.loadQuoteStep(enquiryId);
    }
    if (target === 'payment' || target === 'review') {
      this.selectedQuoteId.set(this.createdEnquiry()?.selectedQuoteId || null);
      this.policyRequestId.set(this.createdEnquiry()?.policyRequestId || null);
      this.loadPolicySummary(enquiryId);
      if (target === 'payment') this.loadQrDetails(enquiryId);
    }
  }

  cancelExistingEnquiry(): void {
    this.existingEnquiryStep.set(null);
    this.backToQueue();
  }

  @HostListener('document:keydown.escape', ['$event'])
  preventExistingEnquiryDismissal(event: Event): void {
    if (this.existingEnquiryStep() !== null) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  documentsFor(type: DocumentType, side?: DocumentSide): AdminUploadedDocument[] {
    return this.uploadedDocuments().filter(document => document.docType === type && (!side || document.docSide === side));
  }

  categoryComplete(type: DocumentType): boolean {
    return this.documentsFor(type).length > 0;
  }

  get canFinishUpload(): boolean {
    return this.categoryComplete('RC') && this.categoryComplete('Identity') &&
      this.uploadCount() === 0 && !this.deletingDocumentId() && !this.replacingDocumentId() && !this.isDocumentsLoading() && !this.documentsError();
  }

  loadDocuments(enquiryId: string): void {
    if (!enquiryId) return;
    this.isDocumentsLoading.set(true);
    this.documentsError.set(null);
    this.enquiryService.getVehicleDocuments(enquiryId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isDocumentsLoading.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.documentsError.set(response.message || 'Unable to load enquiry documents.');
          return;
        }
        const mapped = response.data.map(document => this.mapDocument(document))
          .filter((document): document is AdminUploadedDocument => !!document);
        const mappedIds = new Set(mapped.map(document => document.id));
        const pendingLocal = this.uploadedDocuments().filter(document => document.isLocalPreview && !mappedIds.has(document.id));
        this.uploadedDocuments.set([...mapped, ...pendingLocal]);
      },
      error: error => this.documentsError.set(error?.error?.message || 'Unable to load enquiry documents.'),
    });
  }

  private mapDocument(document: VehicleDocumentApiItem): AdminUploadedDocument | null {
    const value = String(document.docType || '').toLowerCase();
    const docType: DocumentType | undefined = value === 'rc' ? 'RC' :
      ['identity', 'id', 'identityproof', 'idproof'].includes(value) ? 'Identity' :
      value === 'previouspolicy' ? 'PreviousPolicy' :
      value === 'vehicleimage' ? 'VehicleImage' : undefined;
    if (!docType) return null;
    const docSide: DocumentSide = String(document.docSide || '').toLowerCase() === 'back' ? 'Back' : 'Front';
    return {
      id: document.id,
      docType,
      docSide,
      fileName: document.fileName || 'Uploaded image',
      url: this.resolveDocumentUrl(document.url),
    };
  }

  private resolveDocumentUrl(value: string): string {
    if (!value || /^(https?:|blob:|data:)/i.test(value)) return value;
    const storageBase = (environment.r2Url || '').replace(/\/+$/, '');
    const marker = value.indexOf('vehicledocs/');
    if (marker >= 0 && storageBase) return `${storageBase}/${value.substring(marker)}`;
    const cleanPath = value.replace(/^\/+/, '');
    if (storageBase) return `${storageBase}/${cleanPath}`;
    return `${environment.apiUrl.replace(/\/api\/?$/, '')}/${cleanPath}`;
  }

  onDocumentFilesSelected(event: Event, type: DocumentType, side: DocumentSide): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.uploadError.set(null);
    const invalidFile = files.find(file => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024);
    if (invalidFile) {
      this.uploadError.set(`${invalidFile.name} is not a supported image or exceeds 10 MB.`);
      return;
    }
    const enquiryId = this.createdEnquiry()?.enquiryId;
    if (!enquiryId) return;
    files.forEach(file => this.uploadOneDocument(enquiryId, file, type, side));
  }

  private uploadOneDocument(enquiryId: string, file: File, type: DocumentType, side: DocumentSide): void {
    this.uploadCount.update(count => count + 1);
    this.enquiryService.uploadDocument({ enquiryId, docType: type, docSide: side, file }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.uploadCount.update(count => Math.max(0, count - 1)))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.uploadError.set(response.message || `Could not upload ${file.name}.`);
          return;
        }
        const documentId = typeof response.data === 'string' ? response.data : String((response.data as any)?.id || '');
        if (!documentId) {
          this.uploadError.set(`The upload for ${file.name} succeeded, but the server did not return a document ID.`);
          this.loadDocuments(enquiryId);
          return;
        }
        this.uploadedDocuments.update(documents => [...documents, {
          id: documentId,
          docType: type,
          docSide: side,
          fileName: file.name,
          url: URL.createObjectURL(file),
          isLocalPreview: true,
        }]);
        this.loadDocuments(enquiryId);
      },
      error: error => this.uploadError.set(error?.error?.message || `Could not upload ${file.name}.`),
    });
  }

  async deleteDocument(document: AdminUploadedDocument): Promise<void> {
    if (this.deletingDocumentId() || this.replacingDocumentId()) return;
    if (!window.confirm(`Delete ${document.fileName}? This action cannot be undone.`)) return;
    this.deletingDocumentId.set(document.id);
    this.uploadError.set(null);
    this.enquiryService.deleteVehicleDocument(document.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deletingDocumentId.set(null))
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.uploadError.set(response.message || 'The document could not be deleted.');
          return;
        }
        this.uploadedDocuments.update(documents => documents.filter(item => item.id !== document.id));
        if (document.isLocalPreview) URL.revokeObjectURL(document.url);
        const enquiryId = this.createdEnquiry()?.enquiryId;
        if (enquiryId) this.loadDocuments(enquiryId);
      },
      error: error => this.uploadError.set(error?.error?.message || 'The document could not be deleted.'),
    });
  }

  onReplacementSelected(event: Event, document: AdminUploadedDocument): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadError.set(null);
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      this.uploadError.set(`${file.name} is not a supported image or exceeds 10 MB.`);
      return;
    }
    if (this.replacingDocumentId() || this.deletingDocumentId()) return;
    this.replacingDocumentId.set(document.id);
    this.enquiryService.replaceVehicleDocument(document.id, file).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.replacingDocumentId.set(null))
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.uploadError.set(response.message || `Could not replace ${document.fileName}.`);
          return;
        }
        const localUrl = URL.createObjectURL(file);
        this.uploadedDocuments.update(documents => documents.map(item => item.id === document.id ? {
          ...item,
          fileName: file.name,
          url: localUrl,
          isLocalPreview: true,
        } : item));
        if (document.isLocalPreview) URL.revokeObjectURL(document.url);
        const enquiryId = this.createdEnquiry()?.enquiryId;
        if (enquiryId) this.loadDocuments(enquiryId);
      },
      error: error => this.uploadError.set(error?.error?.message || `Could not replace ${document.fileName}.`),
    });
  }

  submitEnquiry(): void {
    if (!this.canFinishUpload || this.isSubmittingEnquiry()) return;
    const current = this.createdEnquiry();
    if (!current?.enquiryId || !current.accountId) {
      this.submitEnquiryError.set('The enquiry or selected agent account could not be found. Return to the enquiry and try again.');
      return;
    }
    this.submitEnquiryError.set(null);
    this.isSubmittingEnquiry.set(true);
    const payload: SubmitVehicleEnquiryPayload = {
      enquiryId: current.enquiryId,
      accountId: current.accountId,
      AccountId: current.accountId,
    };
    this.enquiryService.submitVehicleEnquiry(payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSubmittingEnquiry.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.submitEnquiryError.set(response.message || 'Unable to submit enquiry for quotes.');
          return;
        }
        const submittedId = response.data.enquiryId || current.enquiryId!;
        const submitted = { ...current, enquiryId: submittedId, status: response.data.status || 'Submitted' };
        this.createdEnquiry.set(submitted);
        sessionStorage.setItem('admin-created-enquiry', JSON.stringify(submitted));
        this.step.set('quote');
        this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'quote', enquiryId: submittedId }, queryParamsHandling: 'merge' });
      },
      error: error => this.submitEnquiryError.set(error?.error?.message || 'Unable to submit enquiry for quotes.'),
    });
  }

  get isThirdPartyQuote(): boolean {
    const value = (this.createdEnquiry()?.policyType || this.policyType()).replace(/\s/g, '').toLowerCase();
    return value === 'thirdparty';
  }

  loadQuoteStep(enquiryId: string): void {
    this.quoteLoading.set(true);
    this.quoteError.set(null);
    this.enquiryService.getVehicleQuotes({ enquiryId, pageNumber: 1, pageSize: 100, sortBy: 'quoteDate', sortDescending: true }).pipe(
      switchMap(firstPage => {
        const pageCount = firstPage.data?.totalPages || 1;
        if (pageCount <= 1) return of(firstPage.data?.items || []);
        const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) =>
          this.enquiryService.getVehicleQuotes({ enquiryId, pageNumber: index + 2, pageSize: 100, sortBy: 'quoteDate', sortDescending: true })
        );
        return forkJoin(remainingPages).pipe(map(pages => [
          ...(firstPage.data?.items || []),
          ...pages.flatMap(page => page.data?.items || []),
        ]));
      }),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.quoteLoading.set(false))
    ).subscribe({
      next: items => this.quotes.set(items),
      error: error => { this.quoteError.set(error?.error?.message || 'Unable to load quotes.'); this.quotes.set([]); },
    });
    this.enquiryService.getVendors().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.vendors.set((response.data || []).filter(vendor => vendor.isActive)),
      error: () => this.quoteError.set(this.quoteError() || 'Unable to load vendors.'),
    });
    this.enquiryService.getInsuranceCompanies().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.insuranceCompanies.set(response.data || []),
      error: () => this.quoteError.set(this.quoteError() || 'Unable to load insurance companies.'),
    });
  }

  addQuote(): void {
    const enquiryId = this.createdEnquiry()?.enquiryId;
    const form = this.quoteForm;
    if (!enquiryId || !form.insuranceCompanyId || form.premium == null || form.companyPayable == null ||
        form.agentPoints == null || form.adminProfit == null || (!this.isThirdPartyQuote && form.idv == null)) {
      this.quoteError.set('Complete all required quote fields.');
      return;
    }
    this.quoteSaving.set(true);
    this.quoteError.set(null);
    this.quoteSuccess.set(null);
    this.enquiryService.addVehicleQuote({
      enquiryId, insuranceCompanyId: form.insuranceCompanyId, vendorId: form.vendorId || null,
      premium: form.premium, companyPayable: form.companyPayable, agentPoints: form.agentPoints,
      adminProfit: form.adminProfit, agentClassCommissionApplicable: form.agentClassCommissionApplicable,
      idv: this.isThirdPartyQuote ? 0 : (form.idv || 0), remarks: form.remarks,
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.quoteSaving.set(false))).subscribe({
      next: response => {
        if (!response.isSuccess) { this.quoteError.set(response.message || 'Unable to add quote.'); return; }
        this.quoteSuccess.set('Quote added successfully.');
        this.quoteForm.insuranceCompanyId = ''; this.quoteForm.vendorId = ''; this.quoteForm.premium = null;
        this.quoteForm.companyPayable = null; this.quoteForm.agentPoints = null; this.quoteForm.adminProfit = null;
        this.quoteForm.idv = null; this.quoteForm.remarks = ''; this.quoteForm.agentClassCommissionApplicable = false;
        this.loadQuoteStep(enquiryId);
      },
      error: error => this.quoteError.set(error?.error?.message || 'Unable to add quote.'),
    });
  }

  selectQuote(quote: QuoteItem): void {
    if (this.isSubmittingQuote()) return;
    this.selectedQuoteId.set(quote.id);
    this.quoteSubmitError.set(null);
  }

  proceedToPayment(): void {
    const enquiryId = this.createdEnquiry()?.enquiryId;
    const quoteId = this.selectedQuoteId();
    if (!enquiryId || !quoteId || this.isSubmittingQuote()) {
      this.quoteSubmitError.set('Select a quote before proceeding to payment.');
      return;
    }
    this.isSubmittingQuote.set(true);
    this.quoteSubmitError.set(null);
    this.workflowNotice.set(null);
    this.enquiryService.submitQuoteSelection(enquiryId, quoteId).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.isSubmittingQuote.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.quoteSubmitError.set(response.message || 'Unable to select this quote.');
          return;
        }
        this.workflowNotice.set(response.message || 'Quote selected successfully.');
        this.createdEnquiry.update(current => ({ ...(current || {}), enquiryId, selectedQuoteId: quoteId }));
        sessionStorage.setItem('admin-created-enquiry', JSON.stringify(this.createdEnquiry()));
        this.step.set('payment');
        this.paymentMode.set('bank');
        this.paymentError.set(null);
        this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'payment', enquiryId }, queryParamsHandling: 'merge' });
      },
      error: error => this.quoteSubmitError.set(error?.error?.message || 'Unable to select this quote.'),
    });
  }

  loadPolicySummary(enquiryId: string): void {
    this.enquiryService.getPolicySummary(enquiryId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (response.isSuccess && response.data) {
          this.selectedPolicySummary.set(response.data);
          if (response.data.selectedQuoteId) this.selectedQuoteId.set(response.data.selectedQuoteId);
        } else {
          this.paymentError.set(response.message || 'Unable to load the selected quote payment amount.');
        }
      },
      error: error => this.paymentError.set(error?.error?.message || 'Unable to load the selected quote payment amount.'),
    });
  }

  setPaymentMode(mode: 'bank' | 'ledger'): void {
    this.paymentMode.set(mode);
    this.paymentError.set(null);
    const enquiryId = this.createdEnquiry()?.enquiryId;
    if (!enquiryId) return;
    if (mode === 'bank') this.loadQrDetails(enquiryId);
    else this.loadLedgerDetails(enquiryId);
  }

  retryPaymentDetails(): void {
    const enquiryId = this.createdEnquiry()?.enquiryId;
    if (!enquiryId) return;
    this.paymentError.set(null);
    if (this.agentPayable() === null) this.loadPolicySummary(enquiryId);
    if (this.paymentMode() === 'bank') this.loadQrDetails(enquiryId, true);
    else this.loadLedgerDetails(enquiryId, true);
  }

  loadQrDetails(enquiryId: string, force = false): void {
    if (!force && this.qrLoadedForEnquiry === enquiryId && this.qrDetails()) return;
    this.qrLoading.set(true);
    this.enquiryService.getPolicyQrDetails(enquiryId).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.qrLoading.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.qrDetails.set(null); this.qrLoadedForEnquiry = null;
          this.paymentError.set(response.message || 'Bank transfer details are unavailable.');
          return;
        }
        this.qrDetails.set(response.data); this.qrLoadedForEnquiry = enquiryId;
      },
      error: error => { this.qrDetails.set(null); this.qrLoadedForEnquiry = null; this.paymentError.set(error?.error?.message || 'Unable to load bank transfer details.'); },
    });
  }

  loadLedgerDetails(enquiryId: string, force = false): void {
    if (!force && this.ledgerLoadedForEnquiry === enquiryId && this.ledgerDetails()) return;
    this.ledgerLoading.set(true);
    this.enquiryService.getLedgerPaymentDetails(enquiryId).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.ledgerLoading.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.ledgerDetails.set(null); this.ledgerLoadedForEnquiry = null;
          this.paymentError.set(response.message || 'Manual Wallet details are unavailable.');
          return;
        }
        this.ledgerDetails.set(response.data); this.ledgerLoadedForEnquiry = enquiryId;
      },
      error: error => { this.ledgerDetails.set(null); this.ledgerLoadedForEnquiry = null; this.paymentError.set(error?.error?.message || 'Unable to load ledger details.'); },
    });
  }

  get canSubmitPayment(): boolean {
    if (this.paymentSubmitting() || !this.selectedQuoteId() || !this.createdEnquiry()?.accountId || this.agentPayable() === null) return false;
    if (this.paymentMode() === 'bank') return !!this.qrDetails()?.bankAccountId && !!this.transactionId().trim();
    return !!this.ledgerDetails() && this.ledgerDetails()!.balanceAfterCut >= 0 && !this.ledgerLoading();
  }

  submitPolicyRequest(): void {
    if (!this.canSubmitPayment) {
      this.paymentError.set(this.paymentMode() === 'bank'
        ? 'Enter a transaction ID and wait for bank details to load.'
        : 'Manual Wallet payment is unavailable or the balance is insufficient.');
      return;
    }
    const enquiryId = this.createdEnquiry()?.enquiryId;
    const quoteId = this.selectedQuoteId();
    const accountId = this.createdEnquiry()?.accountId;
    if (!enquiryId || !quoteId || !accountId) return;
    this.paymentSubmitting.set(true);
    this.paymentError.set(null);
    this.enquiryService.submitPolicyRequest({
      accountId, quoteId, enquiryId, useLedger: this.paymentMode() === 'ledger',
      ...(this.paymentMode() === 'bank' ? {
        transactionId: this.transactionId().trim(), bankAccountId: this.qrDetails()?.bankAccountId || null,
      } : {}),
      remarks: this.paymentRemarks().trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.paymentSubmitting.set(false))).subscribe({
      next: response => {
        if (!response.isSuccess) {
          this.paymentError.set(response.message || 'Unable to submit the policy payment request.');
          return;
        }
        const policyId = typeof response.data === 'string' ? response.data : null;
        this.policyRequestId.set(policyId);
        this.workflowNotice.set(response.message || 'Policy submitted successfully.');
        this.createdEnquiry.update(current => ({ ...(current || {}), policyRequestId: policyId || undefined }));
        sessionStorage.setItem('admin-created-enquiry', JSON.stringify(this.createdEnquiry()));
        this.step.set('review');
        this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'review', enquiryId }, queryParamsHandling: 'merge' });
      },
      error: error => this.paymentError.set(error?.error?.message || 'Unable to submit the policy payment request.'),
    });
  }

  backToQuoteSelection(): void {
    this.step.set('quote');
    const enquiryId = this.createdEnquiry()?.enquiryId;
    this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'quote', enquiryId }, queryParamsHandling: 'merge' });
  }
}
