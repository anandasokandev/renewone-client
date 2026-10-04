import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  EnquiryItem,
  EnquiryStatus,
  EnquiryStatusEnum,
  STATUS_OPTIONS,
  StatusOption,
  AgentEnquiryDetailsData,
  AgentEnquiryDocument,
  AgentEnquiryAssignmentHistoryItem,
} from '../../models/enquiry.model';
import { EnquiryService, PROGRESSIVE_STATUS_SEQUENCE } from '../../services/enquiry/enquiry.service';
import { Auth } from '../../services/auth/auth';
import { Quotes } from '../quotes/quotes';
import { Policy } from '../policy/policy';
import { EnquiryUploadModal } from '../enquiry-upload-modal/enquiry-upload-modal';
import { environment } from '../../../environments/environment';

export interface EnquiryDocViewItem {
  id: string;
  docName: string;
  uploadedAt: string;
  url: string;
  iconType: 'pdf' | 'image' | 'doc';
  name?: string;
  type?: string;
  side?: string;
  size?: string;
  status?: string;
}

@Component({
  selector: 'app-enquiry-details',
  standalone: true,
  imports: [CommonModule, Quotes, Policy, EnquiryUploadModal],
  templateUrl: './enquiry-details.html',
  styleUrl: './enquiry-details.css',
})
export class EnquiryDetails implements OnInit, OnChanges {
  private authService = inject(Auth);
  private enquiryService = inject(EnquiryService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private router = inject(Router);

  @Input() enquiry: EnquiryItem | null = null;
  @Input() enquiryId: string = '';
  @Input() status: EnquiryStatus | string = '';
  @Output() close = new EventEmitter<void>();

  // API Fetched Details State
  readonly enquiryDetailsData = signal<AgentEnquiryDetailsData | null>(null);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly showHistory = signal<boolean>(false);

  // Modal Open State Signals
  readonly showQuotesModal = signal<boolean>(false);
  readonly showPolicyModal = signal<boolean>(false);
  readonly showUploadDocsModal = signal<boolean>(false);
  readonly showDocPreviewModal = signal<boolean>(false);
  readonly previewDoc = signal<EnquiryDocViewItem | null>(null);

  // Documents State
  readonly documents = signal<EnquiryDocViewItem[]>([]);
  readonly isLoadingDocs = signal<boolean>(false);
  readonly quotesCount = signal<number>(0);

  readonly progressiveSequence: EnquiryStatus[] = PROGRESSIVE_STATUS_SEQUENCE;
  readonly statusOptions: StatusOption[] = STATUS_OPTIONS;

  ngOnInit(): void {
    const id = this.effectiveEnquiryId();
    if (id) {
      this.fetchEnquiryDetails(id);
      this.loadQuotesCount(id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['enquiry'] || changes['enquiryId']) && !changes['enquiry']?.firstChange) {
      const id = this.effectiveEnquiryId();
      if (id) {
        this.fetchEnquiryDetails(id);
        this.loadQuotesCount(id);
      }
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.showDocPreviewModal()) {
      this.closeDocPreview();
    } else if (this.showUploadDocsModal()) {
      this.closeUploadDocsModal();
    } else if (this.showQuotesModal()) {
      this.closeQuotes();
    } else if (this.showPolicyModal()) {
      this.closePolicy();
    } else {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  // --- API Call: /api/Enquiry/agent/enquiry-details/{enquiryId} ---
  fetchEnquiryDetails(id: string): void {
    if (!id) return;
    this.isLoadingDetails.set(true);

    this.enquiryService.getAgentEnquiryDetails(id).subscribe({
      next: (res) => {
        this.isLoadingDetails.set(false);
        if (res && res.isSuccess && res.data) {
          this.enquiryDetailsData.set(res.data);
          this.bindDocumentsFromData(res.data);
        } else {
          this.enquiryDetailsData.set(null);
          this.documents.set([]);
        }
      },
      error: (err) => {
        this.isLoadingDetails.set(false);
        console.error('API /api/Enquiry/agent/enquiry-details/{id} error:', err);
        this.enquiryDetailsData.set(null);
        this.documents.set([]);
      },
    });
  }

  private bindDocumentsFromData(data: AgentEnquiryDetailsData): void {
    if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
      const mapped: EnquiryDocViewItem[] = data.documents.map((d: AgentEnquiryDocument) => {
        const isPdf = (d.url || '').toLowerCase().endsWith('.pdf');
        const resolvedDocName = d.docName || this.resolveDocFallbackName(d);
        const resolvedUploadedAt = d.uploadedAt || data.createdAt || '';
        return {
          id: d.id,
          docName: resolvedDocName,
          name: resolvedDocName,
          type: this.formatDocType(d.docType),
          side: d.docSide ? String(d.docSide) : undefined,
          uploadedAt: resolvedUploadedAt,
          url: this.resolveDocumentUrl(d.url),
          iconType: isPdf ? 'pdf' : 'image',
        };
      });
      this.documents.set(mapped);
    } else {
      this.documents.set([]);
    }
  }

  private resolveDocFallbackName(d: AgentEnquiryDocument): string {
    if (d.docType) {
      const typeStr = this.formatDocType(d.docType);
      return d.docSide ? `${typeStr} - ${d.docSide}` : typeStr;
    }
    return (d.url || '').split('/').pop() || 'Document';
  }

  // --- Quotes & Policy Actions ---
  openQuotes(): void {
    if (!this.hasQuote()) return;
    this.showQuotesModal.set(true);
  }

  closeQuotes(): void {
    this.showQuotesModal.set(false);
    // Reload details after closing quotes to reflect status/quote updates
    this.fetchEnquiryDetails(this.effectiveEnquiryId());
  }

  openPolicy(): void {
    if (!this.hasPolicy()) return;
    this.showPolicyModal.set(true);
  }

  closePolicy(): void {
    this.showPolicyModal.set(false);
  }

  toggleHistory(): void {
    this.showHistory.update((v) => !v);
  }

  // --- Document Upload Modal Actions ---
  openUploadDocsModal(): void {
    this.showUploadDocsModal.set(true);
  }

  closeUploadDocsModal(): void {
    this.showUploadDocsModal.set(false);
  }

  redirectToUploadDocuments(): void {
    this.openUploadDocsModal();
  }

  onUploadSubmitted(event: { enquiryId: string; redirectToQuotes?: boolean }): void {
    this.closeUploadDocsModal();
    const id = this.effectiveEnquiryId();
    if (id) {
      this.fetchEnquiryDetails(id);
      this.loadQuotesCount(id);
    }
    if (event.redirectToQuotes) {
      this.openQuotes();
    }
  }

  onDocumentsUpdated(): void {
    const id = this.effectiveEnquiryId();
    if (id) {
      this.fetchEnquiryDetails(id);
    }
  }

  // --- Document Preview & Download ---
  openDocPreview(doc: EnquiryDocViewItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.isPolicyIssued()) return;
    this.previewDoc.set(doc);
    this.showDocPreviewModal.set(true);
  }

  closeDocPreview(): void {
    this.showDocPreviewModal.set(false);
    this.previewDoc.set(null);
  }

  downloadDoc(doc: EnquiryDocViewItem, event: Event): void {
    event.stopPropagation();
    if (this.isPolicyIssued() || !doc.url) return;

    const ext = this.getFileExtension(doc.url) || (doc.iconType === 'pdf' ? 'pdf' : 'jpg');
    let fileName = (doc.docName || doc.name || 'Document').trim();
    if (!fileName.toLowerCase().endsWith('.' + ext.toLowerCase())) {
      fileName = `${fileName}.${ext}`;
    }

    const triggerBlobDownload = (blob: Blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 200);
    };

    // 1. Try Angular HttpClient
    this.http.get(doc.url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        triggerBlobDownload(blob);
      },
      error: () => {
        // 2. Try Fetch API
        fetch(doc.url, { mode: 'cors' })
          .then((res) => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.blob();
          })
          .then((blob) => {
            triggerBlobDownload(blob);
          })
          .catch(() => {
            // 3. Fallback: Hidden iframe download (triggers browser direct file save without leaving page or opening new tab)
            let iframe = document.getElementById('hidden-doc-download-frame') as HTMLIFrameElement;
            if (!iframe) {
              iframe = document.createElement('iframe');
              iframe.id = 'hidden-doc-download-frame';
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
            }
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = doc.url;
            a.download = fileName;
            a.target = 'hidden-doc-download-frame';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
            }, 500);
          });
      },
    });
  }

  private getFileExtension(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  getSafeDocPreviewUrl(url?: string): SafeResourceUrl | null {
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  resolveDocumentUrl(relativeOrAbsoluteUrl?: string): string {
    if (!relativeOrAbsoluteUrl) return '';
    const r2Base = (environment.r2Url || '').replace(/\/+$/, '');

    if (
      relativeOrAbsoluteUrl.startsWith('blob:') ||
      relativeOrAbsoluteUrl.startsWith('data:')
    ) {
      return relativeOrAbsoluteUrl;
    }

    const vIndex = relativeOrAbsoluteUrl.indexOf('vehicledocs/');
    if (vIndex !== -1 && r2Base) {
      const subPath = relativeOrAbsoluteUrl.substring(vIndex);
      return `${r2Base}/${subPath}`;
    }

    if (
      relativeOrAbsoluteUrl.startsWith('http://') ||
      relativeOrAbsoluteUrl.startsWith('https://')
    ) {
      return relativeOrAbsoluteUrl;
    }

    const cleanUrl = relativeOrAbsoluteUrl.startsWith('/')
      ? relativeOrAbsoluteUrl.slice(1)
      : relativeOrAbsoluteUrl;

    if (r2Base) {
      return `${r2Base}/${cleanUrl}`;
    }

    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}/${cleanUrl}`;
  }

  formatDocType(docType?: string): string {
    if (!docType) return 'Document';
    switch (docType.toLowerCase()) {
      case 'rc':
        return 'RC Copy';
      case 'identity':
        return 'Identity / KYC';
      case 'previouspolicy':
        return 'Previous Policy';
      case 'vehicleimage':
        return 'Vehicle Photo';
      default:
        return docType;
    }
  }

  // --- Agency Required Field Getters ---
  effectiveEnquiryId(): string {
    return (
      this.enquiryDetailsData()?.enquiryId ||
      this.enquiry?.enquiryId ||
      this.enquiryId ||
      this.enquiry?.id ||
      ''
    );
  }

  effectiveEnquiryNumber(): string {
    return (
      this.enquiryDetailsData()?.enquiryNumber ||
      this.enquiry?.enquiryNumber ||
      this.enquiry?.enquiryId ||
      this.enquiryId ||
      ''
    );
  }

  customerName(): string {
    return (
      this.enquiryDetailsData()?.customerName ||
      this.enquiry?.customerName ||
      ''
    );
  }

  customerPhone(): string {
    return (
      this.enquiryDetailsData()?.phoneNumber ||
      this.enquiry?.phoneNumber ||
      this.enquiry?.customerPhone ||
      ''
    );
  }

  insuranceType(): string {
    return (
      this.enquiryDetailsData()?.insuranceType ||
      this.enquiry?.insuranceType ||
      ''
    );
  }

  policyType(): string {
    return (
      this.enquiryDetailsData()?.policyType ||
      this.enquiry?.policyType ||
      ''
    );
  }

  vehicleType(): string {
    return (
      this.enquiryDetailsData()?.vehicleType ||
      this.enquiry?.vehicleType ||
      ''
    );
  }

  isVehicleInsurance(): boolean {
    const type = this.insuranceType().toLowerCase();
    const vType = this.vehicleType().toLowerCase();
    return (
      type.includes('vehicle') ||
      type.includes('motor') ||
      type.includes('auto') ||
      type.includes('car') ||
      type.includes('bike') ||
      type.includes('two wheeler') ||
      type.includes('commercial auto') ||
      vType.length > 0 ||
      this.hasVehicleNumber() ||
      this.hasEngineNumber() ||
      this.hasChasisNumber()
    );
  }

  hasVehicleNumber(): boolean {
    return !!(
      this.enquiryDetailsData()?.vehicleNumber ||
      this.enquiry?.vehicleNumber
    );
  }

  vehicleNumber(): string {
    return (
      this.enquiryDetailsData()?.vehicleNumber ||
      this.enquiry?.vehicleNumber ||
      ''
    );
  }

  hasEngineNumber(): boolean {
    return !!(
      this.enquiryDetailsData()?.engineNumber ||
      this.enquiry?.engineNumber ||
      (this.enquiry as any)?.engineNo
    );
  }

  engineNumber(): string {
    return (
      this.enquiryDetailsData()?.engineNumber ||
      this.enquiry?.engineNumber ||
      (this.enquiry as any)?.engineNo ||
      ''
    );
  }

  hasChasisNumber(): boolean {
    return !!(
      this.enquiryDetailsData()?.chassisNumber ||
      this.enquiry?.chassisNumber ||
      this.enquiry?.chasisNumber ||
      (this.enquiry as any)?.chassisNo
    );
  }

  chasisNumber(): string {
    return (
      this.enquiryDetailsData()?.chassisNumber ||
      this.enquiry?.chassisNumber ||
      this.enquiry?.chasisNumber ||
      (this.enquiry as any)?.chassisNo ||
      ''
    );
  }

  createdBy(): string {
    return (
      this.enquiryDetailsData()?.createdByName ||
      (this.enquiry as any)?.createdByName ||
      (this.enquiry as any)?.createdAgentName ||
      (this.enquiry as any)?.createdAgent ||
      (this.enquiry as any)?.creatorName ||
      ''
    );
  }

  createdByNumber(): string {
    return (
      (this.enquiry as any)?.createdAgentNumber ||
      (this.enquiry as any)?.createdByNumber ||
      (this.enquiry as any)?.creatorPhone ||
      ''
    );
  }

  createdAt(): string {
    return (
      this.enquiryDetailsData()?.createdAt ||
      this.enquiry?.createdAt ||
      ''
    );
  }

  updatedAt(): string {
    return (
      this.enquiryDetailsData()?.updatedAt ||
      this.enquiry?.lastUpdated ||
      ''
    );
  }

  assignedAgent(): string {
    return (
      this.enquiryDetailsData()?.assignedAgentName ||
      this.enquiry?.assignedAgentName ||
      this.enquiryDetailsData()?.agentName ||
      this.enquiry?.assignedStaff ||
      'Unassigned'
    );
  }

  assignedAgentPhone(): string {
    return (
      this.enquiryDetailsData()?.assignedAgentNumber ||
      this.enquiry?.assigedAgentNumber ||
      this.enquiry?.assignedAgentNumber ||
      ''
    );
  }

  assignedAgentRole(): string {
    return (this.enquiry as any)?.assignedStaffRole || '';
  }

  hasAssignedAgent(): boolean {
    const name = this.assignedAgent().trim().toLowerCase();
    return !!name && name !== 'unassigned' && name !== 'null';
  }

  hasQuote(): boolean {
    const data = this.enquiryDetailsData();
    if (data && data.hasQuote !== undefined && data.hasQuote !== null) {
      return data.hasQuote === true || (data.hasQuote as any) === 'true';
    }
    if (this.enquiry && (this.enquiry as any).hasQuote !== undefined) {
      return (this.enquiry as any).hasQuote === true || (this.enquiry as any).hasQuote === 'true';
    }
    return false;
  }

  hasPolicy(): boolean {
    const data = this.enquiryDetailsData();
    if (data && data.hasPolicy !== undefined && data.hasPolicy !== null) {
      return data.hasPolicy === true || (data.hasPolicy as any) === 'true';
    }
    if (this.enquiry && (this.enquiry as any).hasPolicy !== undefined) {
      return (this.enquiry as any).hasPolicy === true || (this.enquiry as any).hasPolicy === 'true';
    }
    return false;
  }

  assignmentHistory(): AgentEnquiryAssignmentHistoryItem[] {
    return this.enquiryDetailsData()?.assignmentHistory || [];
  }

  activeStatus(): EnquiryStatus | string {
    return (
      this.enquiryDetailsData()?.status ||
      this.enquiry?.status ||
      this.status ||
      ''
    );
  }

  isPolicyIssued(): boolean {
    const status = this.activeStatus();
    if (typeof status === 'number') {
      return status === EnquiryStatusEnum.PolicyIssued || status === 7;
    }
    const s = String(status || '').trim().toLowerCase();
    return s === 'policyissued' || s === '7' || s === 'policy issued';
  }

  isCreated(): boolean {
    const status = this.activeStatus();
    if (typeof status === 'number') {
      return status === EnquiryStatusEnum.Created || status === 1;
    }
    const s = String(status || '').trim().toLowerCase();
    return s === 'created' || s === '1';
  }

  headlineTitle(): string {
    const name = this.customerName();
    if (this.isVehicleInsurance() && this.vehicleNumber()) {
      return name ? `${name} — ${this.vehicleNumber()}` : this.vehicleNumber();
    }
    const type = this.insuranceType();
    if (name && type) {
      return `${name} — ${type}`;
    }
    return name || type || (this.effectiveEnquiryNumber() ? `Enquiry ${this.effectiveEnquiryNumber()}` : 'Enquiry Details');
  }

  hasUploadedDocuments(): boolean {
    return this.documents().length > 0;
  }

  private loadQuotesCount(id: string): void {
    this.enquiryService.getVehicleQuotes({ enquiryId: id }).subscribe({
      next: (res) => {
        if (res && res.data && Array.isArray(res.data.items)) {
          this.quotesCount.set(res.data.items.length);
        } else {
          this.quotesCount.set(0);
        }
      },
      error: () => {
        this.quotesCount.set(0);
      },
    });
  }

  // --- Status & Lifecycle Progress Helpers ---
  getStatusOption(status: EnquiryStatus | number | string): StatusOption | undefined {
    return this.statusOptions.find(
      (s) =>
        s.key === status ||
        s.id === status ||
        String(s.id) === String(status) ||
        s.key.toLowerCase() === String(status).toLowerCase()
    );
  }

  getStatusLabel(status: EnquiryStatus | number | string): string {
    if (!status) return '—';
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
    if (!status || this.isCancelled(status)) return 0;
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
        return 'In Progress';
      case 'PolicyIssued':
        return 'Issued';
      default:
        return stage;
    }
  }

  isStageCompletedOrCurrent(currentStatus: EnquiryStatus | number | string, stageIndex: number): boolean {
    if (this.isCancelled(currentStatus)) return false;
    const currentIdx = this.getStatusStageIndex(currentStatus);
    return currentIdx >= stageIndex;
  }

  isStageCurrent(currentStatus: EnquiryStatus | number | string, stageIndex: number): boolean {
    if (this.isCancelled(currentStatus)) return false;
    const currentIdx = this.getStatusStageIndex(currentStatus);
    return currentIdx === stageIndex;
  }

  // --- WhatsApp Web Integration ---
  openWhatsApp(event: Event): void {
    event.stopPropagation();
    if (!this.hasAssignedAgent()) return;

    const enquiryNumber = this.effectiveEnquiryNumber();
    const agentName = this.assignedAgent();
    const enquiryStatus = this.getStatusLabel(this.activeStatus());
    const creatorAndNumber = [this.createdBy(), this.createdByNumber()].filter(Boolean).join(', ');

    const message = [
      `Enquiry Regarding ${enquiryNumber}`,
      `Agent Name - ${agentName}`,
      `Created Agent & Number - ${creatorAndNumber}`,
      `Enquiry Status - ${enquiryStatus}`,
    ].join('\n');

    const agentPhone = this.assignedAgentPhone();
    let cleanPhone = agentPhone.toString().replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const whatsappUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}
