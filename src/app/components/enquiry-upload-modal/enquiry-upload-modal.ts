import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  DocumentType,
  DocumentSide,
  UploadedDocItem,
  AgentEnquiryDetailsData,
} from '../../models/enquiry.model';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { environment } from '../../../environments/environment';

export interface DocSlotConfig {
  docSide: string;
  label: string;
}

@Component({
  selector: 'app-enquiry-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enquiry-upload-modal.html',
  styleUrl: './enquiry-upload-modal.css',
})
export class EnquiryUploadModal implements OnInit, OnChanges, OnDestroy {
  private enquiryService = inject(EnquiryService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  @Input() enquiryId: string = '';
  @Input() enquiryNumber: string = '';
  @Input() customerName: string = '';
  @Input() customerPhone: string = '';
  @Input() vehicleNumber: string = '';
  @Input() insuranceType: string = '';
  @Input() vehicleType: string = '';

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<{ enquiryId: string; redirectToQuotes?: boolean }>();
  @Output() documentsUpdated = new EventEmitter<void>();

  // Fetched enquiry details state
  readonly enquiryDetails = signal<AgentEnquiryDetailsData | null>(null);
  readonly isLoadingEnquiry = signal<boolean>(false);

  // Document Upload State
  readonly docSlotsMap = signal<Record<string, DocSlotConfig[]>>({
    RC: [{ docSide: 'Front', label: 'RC Document (Front / Main)' }],
    Identity: [{ docSide: 'Front', label: 'ID Proof (Front / Main)' }],
    PreviousPolicy: [{ docSide: 'Front', label: 'Policy Schedule (Main)' }],
    VehicleImage: [{ docSide: 'Front', label: 'Front Angle Photo' }],
  });

  readonly uploadedDocs = signal<Record<string, UploadedDocItem>>({});
  readonly activePreviewDoc = signal<UploadedDocItem | null>(null);
  readonly uploadErrorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isLoadingDocuments = signal<boolean>(false);
  readonly isSubmittingQuote = signal<boolean>(false);

  // Instant Quote Modal Signals
  readonly showInstantQuoteModal = signal<boolean>(false);
  readonly quoteCountdownSeconds = signal<number>(5);
  readonly quoteRedirectEnquiryId = signal<string | null>(null);
  private quoteCountdownTimer: any = null;
  private toastTimeoutId: any = null;

  readonly uploadedDocsList = computed<UploadedDocItem[]>(() => {
    return Object.values(this.uploadedDocs()).filter((d) => d.status === 'uploaded');
  });

  readonly uploadedDocsCount = computed<number>(() => {
    return this.uploadedDocsList().length;
  });

  readonly safeActivePreviewUrl = computed<SafeResourceUrl | undefined>(() => {
    const doc = this.activePreviewDoc();
    return doc?.previewUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(doc.previewUrl)
      : undefined;
  });

  ngOnInit(): void {
    const id = this.effectiveEnquiryId();
    if (id) {
      this.loadEnquiryDetails(id);
      this.loadVehicleDocuments(id);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiryId'] && !changes['enquiryId'].firstChange) {
      const id = this.effectiveEnquiryId();
      if (id) {
        this.loadEnquiryDetails(id);
        this.loadVehicleDocuments(id);
      }
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.activePreviewDoc()) {
      this.closePreview();
    } else if (this.showInstantQuoteModal()) {
      this.cancelInstantQuoteRedirect();
    } else {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  effectiveEnquiryId(): string {
    return this.enquiryId || this.enquiryDetails()?.enquiryId || '';
  }

  displayEnquiryNumber(): string {
    return (
      this.enquiryNumber ||
      this.enquiryDetails()?.enquiryNumber ||
      this.effectiveEnquiryId()
    );
  }

  displayCustomerName(): string {
    return this.customerName || this.enquiryDetails()?.customerName || '';
  }

  displayCustomerPhone(): string {
    return this.customerPhone || this.enquiryDetails()?.phoneNumber || '';
  }

  displayVehicleNumber(): string {
    return this.vehicleNumber || this.enquiryDetails()?.vehicleNumber || '';
  }

  displayInsuranceType(): string {
    return this.insuranceType || this.enquiryDetails()?.insuranceType || 'Vehicle Insurance';
  }

  loadEnquiryDetails(enquiryId: string): void {
    if (!enquiryId) return;
    this.isLoadingEnquiry.set(true);

    this.enquiryService.getAgentEnquiryDetails(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingEnquiry.set(false);
        if (res && res.isSuccess && res.data) {
          this.enquiryDetails.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingEnquiry.set(false);
        console.error('Failed to fetch enquiry details for upload modal:', err);
      },
    });
  }

  // --- Vehicle Documents API: GET /api/VehicleEnquiry/{enquiryId}/documents ---
  loadVehicleDocuments(enquiryId: string): void {
    if (!enquiryId) return;

    this.isLoadingDocuments.set(true);
    this.enquiryService.getVehicleDocuments(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingDocuments.set(false);
        if (res.isSuccess && Array.isArray(res.data)) {
          this.uploadedDocs.update((current) => {
            const updated = { ...current };
            for (const doc of res.data) {
              this.ensureDocSlotExists(doc.docType as DocumentType, doc.docSide as DocumentSide);
              const key = `${doc.docType}_${doc.docSide}`;
              const fullUrl = this.resolveDocumentUrl(doc.url);
              const isPdf =
                (doc.url && doc.url.toLowerCase().endsWith('.pdf')) ||
                (doc.fileName && doc.fileName.toLowerCase().endsWith('.pdf'));

              const existing = updated[key];
              const previewUrl =
                existing?.previewUrl && existing.previewUrl.startsWith('blob:')
                  ? existing.previewUrl
                  : fullUrl;

              updated[key] = {
                id: doc.id,
                docType: doc.docType as DocumentType,
                docSide: doc.docSide as DocumentSide,
                fileName: doc.fileName || `${doc.docType}_${doc.docSide}`,
                fileSize: existing?.fileSize || 0,
                fileType: isPdf ? 'application/pdf' : existing?.fileType || 'image/jpeg',
                previewUrl: previewUrl,
                uploadedAt: existing?.uploadedAt || new Date().toISOString(),
                status: 'uploaded',
              };
            }
            return updated;
          });
        }
      },
      error: (err) => {
        this.isLoadingDocuments.set(false);
        console.warn('Could not fetch existing vehicle documents:', err);
      },
    });
  }

  addDocSlot(docType: DocumentType): void {
    this.docSlotsMap.update((current) => {
      const existing = current[docType] || [];
      const count = existing.length;

      let nextSide = 'Back';
      let nextLabel = '';

      if (docType === 'RC') {
        if (!existing.some((s) => s.docSide === 'Back')) {
          nextSide = 'Back';
          nextLabel = 'RC Back Side';
        } else {
          nextSide = `Page_${count + 1}`;
          nextLabel = `RC Additional Page ${count + 1}`;
        }
      } else if (docType === 'Identity') {
        if (!existing.some((s) => s.docSide === 'Back')) {
          nextSide = 'Back';
          nextLabel = 'ID Back Side';
        } else {
          nextSide = `Page_${count + 1}`;
          nextLabel = `Additional ID Proof ${count + 1}`;
        }
      } else if (docType === 'PreviousPolicy') {
        if (!existing.some((s) => s.docSide === 'Back')) {
          nextSide = 'Back';
          nextLabel = 'Endorsement / Back';
        } else {
          nextSide = `Page_${count + 1}`;
          nextLabel = `Policy Endorsement ${count + 1}`;
        }
      } else {
        // VehicleImage
        if (!existing.some((s) => s.docSide === 'Back')) {
          nextSide = 'Back';
          nextLabel = 'Rear Angle Photo';
        } else if (!existing.some((s) => s.docSide === 'Side_Left')) {
          nextSide = 'Side_Left';
          nextLabel = 'Left Side Photo';
        } else if (!existing.some((s) => s.docSide === 'Side_Right')) {
          nextSide = 'Side_Right';
          nextLabel = 'Right Side Photo';
        } else {
          nextSide = `Photo_${count + 1}`;
          nextLabel = `Inspection Photo ${count + 1}`;
        }
      }

      return {
        ...current,
        [docType]: [...existing, { docSide: nextSide, label: nextLabel }],
      };
    });
  }

  ensureDocSlotExists(docType: DocumentType, docSide: DocumentSide): void {
    if (!docType || !docSide) return;
    this.docSlotsMap.update((current) => {
      const existing = current[docType] || [];
      if (existing.some((s) => s.docSide === docSide)) {
        return current;
      }
      let label = `${docType} - ${docSide}`;
      if (docSide === 'Back') {
        label = docType === 'VehicleImage' ? 'Rear Angle Photo' : `${docType} Back Side`;
      }
      return {
        ...current,
        [docType]: [...existing, { docSide, label }],
      };
    });
  }

  canRemoveSlot(docType: DocumentType, docSide: DocumentSide): boolean {
    const slots = this.docSlotsMap()[docType] || [];
    return slots.length > 1 && slots[0].docSide !== docSide;
  }

  removeDocSlot(docType: DocumentType, docSide: DocumentSide): void {
    this.removeDocument(docType, docSide);
    this.docSlotsMap.update((current) => {
      const existing = current[docType] || [];
      return {
        ...current,
        [docType]: existing.filter((s) => s.docSide !== docSide),
      };
    });
  }

  getDocSlot(docType: DocumentType, docSide: DocumentSide): UploadedDocItem | undefined {
    return this.uploadedDocs()[`${docType}_${docSide}`];
  }

  isUploading(docType: DocumentType, docSide: DocumentSide): boolean {
    return this.uploadedDocs()[`${docType}_${docSide}`]?.status === 'uploading';
  }

  onFileSelected(event: Event, docType: DocumentType, docSide: DocumentSide): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.uploadErrorMessage.set(`File "${file.name}" exceeds the 10MB size limit.`);
      input.value = '';
      return;
    }

    this.uploadErrorMessage.set(null);
    this.uploadDocument(file, docType, docSide);
    input.value = '';
  }

  uploadDocument(file: File, docType: DocumentType, docSide: DocumentSide): void {
    const enquiryId = this.effectiveEnquiryId();
    if (!enquiryId) {
      this.uploadErrorMessage.set('Enquiry ID not found. Cannot upload documents.');
      return;
    }

    this.ensureDocSlotExists(docType, docSide);
    const slotKey = `${docType}_${docSide}`;
    let previewUrl: string | undefined;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {}

    const docItem: UploadedDocItem = {
      docType,
      docSide,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      previewUrl,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
    };

    this.uploadedDocs.update((prev) => ({
      ...prev,
      [slotKey]: docItem,
    }));

    this.enquiryService
      .uploadDocument({
        enquiryId,
        docType,
        docSide,
        file,
      })
      .subscribe({
        next: (res) => {
          this.uploadedDocs.update((prev) => ({
            ...prev,
            [slotKey]: {
              ...docItem,
              id: res.data || '',
              status: 'uploaded',
            },
          }));
          this.showSuccessToast(`${docType} (${docSide}) uploaded successfully!`, 3500);
          // Refresh vehicle documents via GET /api/VehicleEnquiry/{enquiryId}/documents
          this.loadVehicleDocuments(enquiryId);
          this.documentsUpdated.emit();
        },
        error: (err) => {
          console.error('Upload API error:', err);
          this.uploadedDocs.update((prev) => {
            const copy = { ...prev };
            delete copy[slotKey];
            return copy;
          });
          this.uploadErrorMessage.set(
            err?.error?.message || `Failed to upload ${docType} (${docSide}). Please try again.`
          );
        },
      });
  }

  removeDocument(docType: DocumentType, docSide: DocumentSide): void {
    const slotKey = `${docType}_${docSide}`;
    const current = this.uploadedDocs()[slotKey];
    if (current?.previewUrl) {
      try {
        URL.revokeObjectURL(current.previewUrl);
      } catch {}
    }

    this.uploadedDocs.update((prev) => {
      const copy = { ...prev };
      delete copy[slotKey];
      return copy;
    });

    if (
      this.activePreviewDoc()?.docType === docType &&
      this.activePreviewDoc()?.docSide === docSide
    ) {
      this.activePreviewDoc.set(null);
    }
  }

  // --- Submitting Enquiry for Quote (create-enquiry.ts:L804-L824) ---
  submitForQuote(): void {
    const enquiryId = this.effectiveEnquiryId();
    if (!enquiryId) {
      this.uploadErrorMessage.set('Enquiry ID not found. Please verify enquiry details.');
      return;
    }

    this.isSubmittingQuote.set(true);
    this.uploadErrorMessage.set(null);

    this.enquiryService.submitVehicleEnquiry({ enquiryId }).subscribe({
      next: (res) => {
        this.isSubmittingQuote.set(false);
        const data = res.data;
        const shouldRedirectToQuotes = data?.redirectToQuotes === true;

        if (shouldRedirectToQuotes) {
          this.triggerInstantQuoteRedirect(data?.enquiryId || enquiryId);
        } else {
          this.showSuccessToast(res?.message || 'Vehicle enquiry submitted for quote successfully!');
          this.submitted.emit({ enquiryId, redirectToQuotes: false });
          setTimeout(() => {
            this.closeModal();
          }, 800);
        }
      },
      error: (err) => {
        console.error('submit-vehicle-enquiry API returned error:', err);
        this.isSubmittingQuote.set(false);
        this.uploadErrorMessage.set(
          err?.error?.message || 'Failed to submit vehicle enquiry for quote. Please try again.'
        );
      },
    });
  }

  triggerInstantQuoteRedirect(enquiryId: string): void {
    this.quoteRedirectEnquiryId.set(enquiryId);
    this.quoteCountdownSeconds.set(5);
    this.showInstantQuoteModal.set(true);

    if (this.quoteCountdownTimer) {
      clearInterval(this.quoteCountdownTimer);
    }

    this.quoteCountdownTimer = setInterval(() => {
      const remaining = this.quoteCountdownSeconds() - 1;
      this.quoteCountdownSeconds.set(remaining);

      if (remaining <= 0) {
        this.proceedToQuotes();
      }
    }, 1000);
  }

  proceedToQuotes(): void {
    if (this.quoteCountdownTimer) {
      clearInterval(this.quoteCountdownTimer);
      this.quoteCountdownTimer = null;
    }
    this.showInstantQuoteModal.set(false);
    const enqId = this.quoteRedirectEnquiryId() || this.effectiveEnquiryId();
    this.submitted.emit({ enquiryId: enqId, redirectToQuotes: true });
    this.closeModal();
    this.router.navigate(['/quotes'], {
      queryParams: {
        status: 'Quoted',
        enquiryId: enqId,
      },
    });
  }

  cancelInstantQuoteRedirect(): void {
    if (this.quoteCountdownTimer) {
      clearInterval(this.quoteCountdownTimer);
      this.quoteCountdownTimer = null;
    }
    this.showInstantQuoteModal.set(false);
    this.showSuccessToast('Redirect cancelled. You can review enquiry details or view quotes anytime.', 4000);
    this.submitted.emit({ enquiryId: this.effectiveEnquiryId(), redirectToQuotes: false });
    this.closeModal();
  }

  openPreview(doc: UploadedDocItem): void {
    this.activePreviewDoc.set(doc);
  }

  closePreview(): void {
    this.activePreviewDoc.set(null);
  }

  resolveDocumentUrl(relativeOrAbsoluteUrl: string): string {
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

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return 'Document on file';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  showSuccessToast(message: string, durationMs = 4000): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }
    this.successMessage.set(message);
    this.toastTimeoutId = setTimeout(() => {
      this.successMessage.set(null);
      this.toastTimeoutId = null;
    }, durationMs);
  }

  dismissToast(): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
    this.successMessage.set(null);
  }

  ngOnDestroy(): void {
    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
    if (this.quoteCountdownTimer) {
      clearInterval(this.quoteCountdownTimer);
      this.quoteCountdownTimer = null;
    }
    // Revoke any created blob urls
    Object.values(this.uploadedDocs()).forEach((doc) => {
      if (doc.previewUrl && doc.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(doc.previewUrl);
        } catch {}
      }
    });
  }
}
