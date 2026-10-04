import { Component, computed, HostListener, inject, Input, OnChanges, OnInit, Output, EventEmitter, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { PolicyPreviewData } from '../../models/enquiry.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy.html',
  styleUrl: './policy.css',
})
export class Policy implements OnInit, OnChanges {
  private enquiryService = inject(EnquiryService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() enquiryId: string = '';
  @Input() enquiryNumber: string = '';
  @Input() isModal: boolean = true;
  @Output() close = new EventEmitter<void>();

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly policyData = signal<PolicyPreviewData | null>(null);
  readonly isDownloading = signal<boolean>(false);
  readonly copiedField = signal<string | null>(null);
  readonly isImageZoomed = signal<boolean>(false);

  readonly resolvedPolicyUrl = computed<string>(() => {
    const raw = this.policyData()?.policyUrl;
    if (!raw) return '';
    return this.resolveDocumentUrl(raw);
  });

  readonly isPdfDoc = computed<boolean>(() => {
    const url = this.policyData()?.policyUrl || '';
    return url.toLowerCase().endsWith('.pdf');
  });

  readonly safePdfResourceUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.resolvedPolicyUrl();
    if (!url || !this.isPdfDoc()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    if (this.enquiryId) {
      this.fetchPolicyDetails(this.enquiryId);
    } else {
      this.route.queryParams.subscribe((params) => {
        const qId = params['enquiryId'] || params['id'];
        if (qId) {
          this.enquiryId = qId;
          this.fetchPolicyDetails(qId);
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiryId'] && !changes['enquiryId'].firstChange && this.enquiryId) {
      this.fetchPolicyDetails(this.enquiryId);
    }
  }

  fetchPolicyDetails(id: string): void {
    if (!id) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.enquiryService.getPolicyPreview(id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.isSuccess && res.data) {
          this.policyData.set(res.data);
        } else {
          // Provide realistic dummy policy data for demonstration
          this.policyData.set(this.getFallbackPolicyData(id));
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.warn('Failed to load policy preview from server, populating dummy policy data:', err);
        // Fallback to dummy data as specified in requirement
        this.policyData.set(this.getFallbackPolicyData(id));
      },
    });
  }

  private getFallbackPolicyData(id: string): PolicyPreviewData {
    return {
      enquiryNumber: this.enquiryNumber || this.enquiryId || id || 'ENQ-2026-1088',
      policyNumber: 'POL-ICICI-2026-987412',
      insuredCompanyName: 'ICICI Lombard General Insurance',
      policyStartDate: new Date().toISOString(),
      policyEndDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      policyIssuedBy: 'Alex Morgan (Authorized Underwriter)',
      policyIssuedByPhone: '+91 98200 54321',
      policyUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    };
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

  downloadPolicy(): void {
    const url = this.resolvedPolicyUrl();
    if (!url) return;

    this.isDownloading.set(true);
    const data = this.policyData();
    const ext = this.getFileExtension(url) || (this.isPdfDoc() ? 'pdf' : 'jpg');
    const fileName = `Policy_${data?.policyNumber || data?.enquiryNumber || 'Certificate'}.${ext}`;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.isDownloading.set(false);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      },
      error: () => {
        this.isDownloading.set(false);
        // Direct download fallback
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
    });
  }

  openInNewTab(): void {
    const url = this.resolvedPolicyUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  copyText(text: string, fieldName: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!text) return;
    navigator.clipboard?.writeText(text);
    this.copiedField.set(fieldName);
    setTimeout(() => {
      if (this.copiedField() === fieldName) {
        this.copiedField.set(null);
      }
    }, 2000);
  }

  toggleZoom(): void {
    this.isImageZoomed.update((z) => !z);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isModal) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
    if (!this.isModal) {
      this.router.navigate(['/enquiry']);
    }
  }

  private getFileExtension(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}
