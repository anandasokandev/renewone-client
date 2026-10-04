import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import {
  VehicleTypeItem,
  InsuranceTypeItem,
  CreateVehicleEnquiryPayload,
  VehicleEnquiryResponseData,
  DocumentType,
  DocumentSide,
  UploadedDocItem,
} from '../../models/enquiry.model';
import { environment } from '../../../environments/environment';

export interface DocSlotConfig {
  docSide: DocumentSide;
  label: string;
}

@Component({
  selector: 'app-create-enquiry',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './create-enquiry.html',
  styleUrl: './create-enquiry.css',
})
export class CreateEnquiry implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private enquiryService = inject(EnquiryService);
  private sanitizer = inject(DomSanitizer);

  // Route Query Parameters
  insuranceTypeName = signal<string>('Vehicle Insurance');
  insuranceTypeId = signal<string | null>(null);
  vehicleTypeId = signal<string | null>(null);
  vehicleTypeName = signal<string>('');

  // Multi-step State
  currentStep = signal<number>(1);
  isSubmitting = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  private toastTimeoutId: any = null;

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

  // Lists for lookup
  availableVehicleTypes = signal<VehicleTypeItem[]>([]);
  availableInsuranceTypes = signal<InsuranceTypeItem[]>([]);

  // Computed Properties
  isVehicleWorkflow = computed(() => {
    const type = this.insuranceTypeName().toLowerCase();
    return type.includes('vehicle') || type === 'car' || type === 'two wheeler' || type === 'commercial';
  });

  // Step 1 Form Group
  step1Form = this.fb.nonNullable.group({
    customerName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        Validators.pattern(/^[a-zA-Z\s.'-]+$/),
      ],
    ],
    contactNumber: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/),
      ],
    ],
    registrationNumber: [
      '',
      [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(15),
        Validators.pattern(/^[a-zA-Z0-9\s-]+$/),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadTypes();
    this.extractQueryParams();
  }

  private loadTypes(): void {
    // Fetch Insurance Types
    this.enquiryService.getInsuranceTypes().subscribe({
      next: (res) => {
        if (res.data) {
          this.availableInsuranceTypes.set(res.data);
          this.resolveTypeName();
        }
      },
      error: () => {
        // Fallback to service constants
      },
    });

    // Fetch Vehicle Types
    this.enquiryService.getVehicleTypes().subscribe({
      next: (res) => {
        if (res.data) {
          this.availableVehicleTypes.set(res.data);
          this.resolveVehicleTypeName();
        }
      },
      error: () => {
        // Fallback: match from local list if needed
      },
    });
  }

  private extractQueryParams(): void {
    this.route.queryParams.subscribe((params) => {
      const typeParam = params['type'];
      const insTypeId = params['insuranceTypeId'];
      const vehTypeId = params['vehicleTypeId'];
      const stepParam = params['step'];
      const enquiryIdParam = params['enquiryId'];
      const customerNameParam = params['customerName'];
      const customerPhoneParam = params['customerPhone'] || params['phone'];
      const regNumberParam = params['registrationNumber'] || params['vehicleNumber'];

      if (typeParam) {
        this.insuranceTypeName.set(typeParam);
      }
      if (insTypeId) {
        this.insuranceTypeId.set(insTypeId);
      }
      if (vehTypeId) {
        this.vehicleTypeId.set(vehTypeId);
      }

      if (customerNameParam) {
        this.step1Form.controls.customerName.setValue(customerNameParam);
      }
      if (customerPhoneParam) {
        this.step1Form.controls.contactNumber.setValue(customerPhoneParam);
      }
      if (regNumberParam) {
        this.step1Form.controls.registrationNumber.setValue(regNumberParam);
      }

      if (enquiryIdParam) {
        this.createdEnquiryResult.set({
          enquiryId: enquiryIdParam,
          submissionType: 'Comprehensive',
        } as any);
        this.loadVehicleDocuments(enquiryIdParam);
      }

      if (stepParam && !isNaN(Number(stepParam))) {
        this.currentStep.set(Number(stepParam));
      }

      this.resolveTypeName();
      this.resolveVehicleTypeName();
    });
  }

  private resolveTypeName(): void {
    const id = this.insuranceTypeId();
    if (id && this.availableInsuranceTypes().length > 0) {
      const matched = this.availableInsuranceTypes().find((t) => t.id === id);
      if (matched) {
        this.insuranceTypeName.set(matched.name);
      }
    }
  }

  private resolveVehicleTypeName(): void {
    const vId = this.vehicleTypeId();
    if (!vId) return;

    // Search in loaded types
    const matched = this.availableVehicleTypes().find((v) => v.id === vId);
    if (matched) {
      this.vehicleTypeName.set(matched.typeName);
      return;
    }

    // Check if ID is directly a known name
    const fallbackList = this.enquiryService.vehicleTypes;
    const directMatch = fallbackList.find(
      (name) => name.toLowerCase() === vId.toLowerCase()
    );
    if (directMatch) {
      this.vehicleTypeName.set(directMatch);
    }
  }

  // Sanitizers and Formatters
  onContactNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Strip non-digit characters
    let cleaned = input.value.replace(/\D/g, '');
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }
    input.value = cleaned;
    this.step1Form.controls.contactNumber.setValue(cleaned);
  }

  onRegistrationInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Auto-convert to uppercase
    const upper = input.value.toUpperCase();
    input.value = upper;
    this.step1Form.controls.registrationNumber.setValue(upper);
  }

  get customerNameControl() {
    return this.step1Form.controls.customerName;
  }

  get contactNumberControl() {
    return this.step1Form.controls.contactNumber;
  }

  get registrationNumberControl() {
    return this.step1Form.controls.registrationNumber;
  }

  get contactDigitsCount(): number {
    return (this.contactNumberControl.value || '').length;
  }

  // Navigation and Actions
  proceedToStep2(): void {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    this.currentStep.set(2);
  }

  backToStep1(): void {
    this.currentStep.set(1);
  }

  resetForm(): void {
    this.step1Form.reset();
  }

  goBackToEnquiries(): void {
    this.router.navigate(['/enquiry']);
  }

  // Step 2 Policy & Vehicle Details State
  readonly policyTypeOptions = ['Comprehensive', 'ThirdParty', 'OwnDamage'] as const;
  selectedPolicyType = signal<string>('Comprehensive');

  isThirdParty = computed(() => {
    const val = this.selectedPolicyType();
    return val === 'ThirdParty' || val === 'Third Party';
  });

  ownerChanged = signal<boolean>(false);
  previousClaim = signal<boolean>(false);

  readonly ncbOptions = [20, 25, 35, 45, 50] as const;
  selectedNcb = signal<number>(20);

  readonly priorityOptions = ['Low', 'Medium', 'High'] as const;
  selectedPriority = signal<string>('Medium');

  selectPolicyType(type: string): void {
    this.selectedPolicyType.set(type);
    if (type === 'ThirdParty' || type === 'Third Party') {
      this.previousClaim.set(false);
    }
  }

  formatPolicyType(type: string): string {
    if (type === 'ThirdParty') return 'Third Party';
    if (type === 'OwnDamage') return 'Own Damage';
    return type;
  }

  toggleOwnerChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ownerChanged.set(input.checked);
  }

  togglePreviousClaim(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.previousClaim.set(input.checked);
  }

  createdEnquiryResult = signal<VehicleEnquiryResponseData | null>(null);
  errorMessage = signal<string | null>(null);

  get priorityNumber(): number {
    switch (this.selectedPriority()) {
      case 'Low':
        return 0;
      case 'High':
        return 2;
      case 'Medium':
      default:
        return 1;
    }
  }

  selectNcb(value: number): void {
    this.selectedNcb.set(value);
  }

  selectPriority(priority: string): void {
    this.selectedPriority.set(priority);
  }

  // Submissions
  createEnquiry(): void {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }

    const priority = this.priorityNumber;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const insTypeId =
      this.insuranceTypeId() ||
      this.availableInsuranceTypes().find((t) => t.name.toLowerCase().includes('vehicle'))?.id ||
      (this.availableInsuranceTypes().length > 0 ? this.availableInsuranceTypes()[0].id : '');

    const vehTypeId =
      this.vehicleTypeId() ||
      this.availableVehicleTypes().find((v) =>
        v.typeName.toLowerCase().includes('car') ||
        v.typeName.toLowerCase().includes('two') ||
        v.typeName.toLowerCase().includes('vehicle')
      )?.id ||
      (this.availableVehicleTypes().length > 0 ? this.availableVehicleTypes()[0].id : '');

    const isTP = this.isThirdParty();
    const payload: CreateVehicleEnquiryPayload = {
      insuranceTypeId: insTypeId,
      vehicleTypeId: vehTypeId,
      customerName: this.customerNameControl.value!.trim(),
      customerNumber: this.contactNumberControl.value!.trim(),
      vehicleNumber: this.registrationNumberControl.value!.trim().toUpperCase(),
      miPolicyType: this.selectedPolicyType(),
      isRCOwnerChanged: this.ownerChanged(),
      hasPreviousClaim: isTP ? false : this.previousClaim(),
      ncbPercentage: isTP || this.previousClaim() ? 0 : this.selectedNcb(),
      priority: priority,
      submissionMode: 1,
    };

    // Keep local cache up to date as well
    this.enquiryService.createEnquiry({
      customerName: payload.customerName,
      customerPhone: payload.customerNumber,
      vehicleNumber: payload.vehicleNumber,
      insuranceType: this.insuranceTypeName(),
      vehicleType: this.vehicleTypeName(),
      policyType: payload.miPolicyType,
      status: 'Created',
      notes: `Priority: ${this.selectedPriority()} | Owner Changed: ${payload.isRCOwnerChanged ? 'Yes' : 'No'} | Previous Claim: ${payload.hasPreviousClaim ? 'Yes' : 'No'} | NCB: ${payload.ncbPercentage}%`,
    });

    this.enquiryService.createVehicleEnquiry(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const data = res.data || {};
        this.createdEnquiryResult.set({
          ...payload,
          ...data,
          submissionType: data.submissionType || payload.miPolicyType,
        });
        this.showSuccessToast('Vehicle insurance enquiry created successfully!');
        this.currentStep.set(3);
        if (data.enquiryId) {
          this.loadVehicleDocuments(data.enquiryId);
        }
      },
      error: (err) => {
        console.error('API call returned error creating vehicle enquiry:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Failed to create vehicle enquiry. Please check your inputs and try again.'
        );
      },
    });
  }

  // Document Upload State
  docSlotsMap = signal<Record<string, DocSlotConfig[]>>({
    RC: [
      { docSide: 'Front', label: 'RC Document (Front / Main)' },
    ],
    Identity: [
      { docSide: 'Front', label: 'ID Proof (Front / Main)' },
    ],
    PreviousPolicy: [
      { docSide: 'Front', label: 'Policy Schedule (Main)' },
    ],
    VehicleImage: [
      { docSide: 'Front', label: 'Front Angle Photo' },
    ],
  });

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

  uploadedDocs = signal<Record<string, UploadedDocItem>>({});
  activePreviewDoc = signal<UploadedDocItem | null>(null);
  uploadErrorMessage = signal<string | null>(null);

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
    const enquiryId = this.createdEnquiryResult()?.enquiryId;
    if (!enquiryId) {
      this.uploadErrorMessage.set('Enquiry ID not found. Please create an enquiry first.');
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
          this.loadVehicleDocuments(enquiryId);
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

  isLoadingDocuments = signal<boolean>(false);

  uploadedDocsList = computed<UploadedDocItem[]>(() => {
    return Object.values(this.uploadedDocs()).filter((d) => d.status === 'uploaded');
  });

  uploadedDocsCount = computed<number>(() => {
    return this.uploadedDocsList().length;
  });

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

  openPreview(doc: UploadedDocItem): void {
    this.activePreviewDoc.set(doc);
  }

  closePreview(): void {
    this.activePreviewDoc.set(null);
  }

  safeActivePreviewUrl = computed<SafeResourceUrl | undefined>(() => {
    const doc = this.activePreviewDoc();
    return doc?.previewUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(doc.previewUrl)
      : undefined;
  });

  getSafeUrl(url?: string): SafeResourceUrl | undefined {
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : undefined;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return 'Document on file';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  startNewEnquiry(): void {
    // Revoke all preview URLs
    Object.values(this.uploadedDocs()).forEach((doc) => {
      if (doc.previewUrl) {
        try {
          URL.revokeObjectURL(doc.previewUrl);
        } catch {}
      }
    });
    this.uploadedDocs.set({});
    this.activePreviewDoc.set(null);
    this.step1Form.reset();
    this.selectedPolicyType.set('Comprehensive');
    this.ownerChanged.set(false);
    this.previousClaim.set(false);
    this.selectedNcb.set(20);
    this.selectedPriority.set('Medium');
    this.docSlotsMap.set({
      RC: [{ docSide: 'Front', label: 'RC Document (Front / Main)' }],
      Identity: [{ docSide: 'Front', label: 'ID Proof (Front / Main)' }],
      PreviousPolicy: [{ docSide: 'Front', label: 'Policy Schedule (Main)' }],
      VehicleImage: [{ docSide: 'Front', label: 'Front Angle Photo' }],
    });
    this.createdEnquiryResult.set(null);
    this.currentStep.set(1);
  }

  isSubmittingQuote = signal<boolean>(false);
  showInstantQuoteModal = signal<boolean>(false);
  quoteCountdownSeconds = signal<number>(5);
  quoteRedirectEnquiryId = signal<string | null>(null);
  private quoteCountdownTimer: any = null;

  submitForQuote(): void {
    const enquiryId = this.createdEnquiryResult()?.enquiryId;
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
          this.triggerInstantQuoteRedirect(data.enquiryId || enquiryId);
        } else {
          this.showSuccessToast(res?.message || 'Vehicle enquiry submitted for quote successfully!');
          this.router.navigate(['/enquiry']);
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
    const enqId = this.quoteRedirectEnquiryId() || this.createdEnquiryResult()?.enquiryId;
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
  }

  saveDraft(): void {
    this.createEnquiry();
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
  }
}
