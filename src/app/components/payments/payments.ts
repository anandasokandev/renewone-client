import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import {
  QuoteItem,
  BankPaymentSubmission,
  LedgerPaymentSubmission,
  PolicySummaryData,
  LedgerPaymentDetailsData,
  PolicyQrDetailsData,
  SubmitPolicyRequestPayload,
  QuotePaymentSummaryData,
} from '../../models/enquiry.model';
import { QRCodeGenerator } from '../../utils/qr-code.util';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class Payments implements OnInit {
  private enquiryService = inject(EnquiryService);
  private sanitizer = inject(DomSanitizer);

  @Input() isReadOnly: boolean = false;

  enquiryIdSignal = signal<string>('');
  @Input()
  set enquiryId(val: string | undefined) {
    this.enquiryIdSignal.set(val || '');
    if (val) {
      this.loadPolicySummaryAndLedger(val);
      this.loadPaymentSummary(val);
      if (this.paymentMethod() === 'BankTransaction') {
        this.loadQrDetails(val);
      }
    }
  }
  get enquiryId(): string {
    return this.enquiryIdSignal();
  }

  quoteSignal = signal<QuoteItem | null>(null);
  @Input()
  set quote(val: QuoteItem | null | undefined) {
    this.quoteSignal.set(val || null);
  }
  get quote(): QuoteItem | null {
    return this.quoteSignal();
  }

  amountSignal = signal<number>(0);
  @Input()
  set amount(val: number) {
    this.amountSignal.set(val);
  }
  get amount(): number {
    return this.amountSignal();
  }

  @Output() close = new EventEmitter<void>();
  @Output() paymentCompleted = new EventEmitter<any>();

  // Payment method switcher: 'Ledger' or 'BankTransaction'
  paymentMethod = signal<'Ledger' | 'BankTransaction'>('Ledger');

  // Real API Data Signals
  policySummary = signal<PolicySummaryData | null>(null);
  ledgerDetails = signal<LedgerPaymentDetailsData | null>(null);
  qrDetails = signal<PolicyQrDetailsData | null>(null);

  // Quote Payment Summary (/api/Enquiry/admin/quote-summary/{enquiryId})
  quotePaymentSummary = signal<QuotePaymentSummaryData | null>(null);
  isLoadingPaymentSummary = signal<boolean>(false);

  // Effective Read-Only Mode (True if input isReadOnly is set, or if payment was already submitted)
  effectiveReadOnly = computed<boolean>(() => {
    if (this.isReadOnly) return true;
    const ps = this.quotePaymentSummary();
    if (!ps) return false;
    return !!(ps.paymentMode || ps.referenceNumber || ps.transactionId || ps.ledgerPaymentTime || ps.paymentDate || (ps.amount && ps.amount > 0));
  });

  // Loading States
  isLoadingPolicySummary = signal<boolean>(false);
  isLoadingLedger = signal<boolean>(false);
  isLoadingQr = signal<boolean>(false);

  // Ledger Verification Action State
  isVerifyingLedger = signal<boolean>(false);
  ledgerSuccess = signal<boolean>(false);

  // Bank Transaction Form State
  transactionId = signal<string>('');
  utrNumber = signal<string>('');
  remark = signal<string>('');
  isSubmittingBank = signal<boolean>(false);
  bankSuccess = signal<boolean>(false);

  // Mandatory Payment Screenshot State
  paymentScreenshotFile = signal<File | null>(null);
  paymentScreenshotPreviewUrl = signal<string | null>(null);
  paymentScreenshotName = signal<string>('');
  paymentScreenshotSize = signal<number>(0);
  isPdfScreenshot = signal<boolean>(false);
  screenshotError = signal<string | null>(null);
  showScreenshotModal = signal<boolean>(false);

  safeScreenshotPreviewUrl = computed<SafeResourceUrl | undefined>(() => {
    const url = this.paymentScreenshotPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : undefined;
  });

  // Alerts & Clipboard
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  copiedField = signal<string | null>(null);

  // Computed Properties Driven by Live API Data
  payableAmount = computed<number>(() => {
    // 0. From quote payment summary if already submitted
    const summaryAmt = this.quotePaymentSummary()?.amount;
    if (summaryAmt !== undefined && summaryAmt !== null && summaryAmt > 0) {
      return summaryAmt;
    }
    // 1. From live ledger details finalAmount
    const ledgerFinal = this.ledgerDetails()?.finalAmount;
    if (ledgerFinal !== undefined && ledgerFinal !== null && ledgerFinal > 0) {
      return ledgerFinal;
    }
    // 2. From policy summary agentPayable
    const agentPayable = this.policySummary()?.agentPayable;
    if (agentPayable !== undefined && agentPayable !== null && agentPayable > 0) {
      return agentPayable;
    }
    // 3. From policy summary premiumAmount
    const premiumAmount = this.policySummary()?.premiumAmount;
    if (premiumAmount !== undefined && premiumAmount !== null && premiumAmount > 0) {
      return premiumAmount;
    }
    // 4. Input fallback
    const customAmt = this.amountSignal();
    if (customAmt && customAmt > 0) return customAmt;
    const q = this.quoteSignal();
    if (q?.premium) return q.premium;
    return 0;
  });

  hasSufficientBalance = computed<boolean>(() => {
    const ldg = this.ledgerDetails();
    if (!ldg) return false;
    // Sufficient if balanceAfterCut >= 0 or ledgerBalance >= finalAmount
    if (ldg.balanceAfterCut !== undefined && ldg.balanceAfterCut !== null) {
      return ldg.balanceAfterCut >= 0;
    }
    return ldg.ledgerBalance >= this.payableAmount();
  });

  remainingBalance = computed<number>(() => {
    const ldg = this.ledgerDetails();
    if (!ldg) return 0;
    if (ldg.balanceAfterCut !== undefined && ldg.balanceAfterCut !== null) {
      return ldg.balanceAfterCut;
    }
    return Math.max(0, ldg.ledgerBalance - this.payableAmount());
  });

  // Dynamic QR Code Formats
  qrCodeDataUrl = signal<string>('');

  upiUri = computed<string>(() => {
    const upi = this.qrDetails()?.upiId?.trim();
    if (!upi) return '';
    const name = this.qrDetails()?.accountHolderName?.trim() || 'R1 Agents Insurance';
    const amt = this.payableAmount();
    const id = this.enquiryIdSignal()?.trim() || 'ENQ';
    const tn = `PolicyPayment_${id}`;
    return `upi://pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=${encodeURIComponent(tn)}`;
  });

  dynamicQrSvg = computed<SafeHtml>(() => {
    const uri = this.upiUri();
    if (!uri) return '';
    const svgString = QRCodeGenerator.generateSvg(uri, 220, 4);
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  });

  constructor() {
    effect(async () => {
      const uri = this.upiUri();
      if (uri) {
        try {
          const url = await QRCodeGenerator.generateDataUrl(uri, 260, 4);
          this.qrCodeDataUrl.set(url);
        } catch {
          this.qrCodeDataUrl.set('');
        }
      } else {
        this.qrCodeDataUrl.set('');
      }
    });
  }

  ngOnInit(): void {
    const id = this.enquiryIdSignal();
    if (id) {
      this.loadPolicySummaryAndLedger(id);
      this.loadPaymentSummary(id);
      if (this.paymentMethod() === 'BankTransaction') {
        this.loadQrDetails(id);
      }
    }
  }

  loadPaymentSummary(enquiryId: string): void {
    if (!enquiryId) return;
    if (this.isLoadingPaymentSummary()) return;

    this.isLoadingPaymentSummary.set(true);
    this.enquiryService.getQuotePaymentSummary(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingPaymentSummary.set(false);
        const data = res?.data;
        if (
          data &&
          (data.paymentMode ||
            data.referenceNumber ||
            data.transactionId ||
            data.ledgerPaymentTime ||
            data.paymentDate ||
            (data.amount && data.amount > 0))
        ) {
          this.quotePaymentSummary.set(data);
          if (data.paymentMode) {
            const mode = data.paymentMode.toLowerCase();
            if (mode.includes('ledger')) {
              this.paymentMethod.set('Ledger');
            } else {
              this.paymentMethod.set('BankTransaction');
              this.loadQrDetails(enquiryId);
            }
          }
          if (data.transactionId || data.referenceNumber) {
            this.transactionId.set(data.transactionId || data.referenceNumber || '');
          }
          if (data.remarks) {
            this.remark.set(data.remarks);
          }
        } else {
          this.quotePaymentSummary.set(null);
        }
      },
      error: () => {
        this.isLoadingPaymentSummary.set(false);
        this.quotePaymentSummary.set(null);
      },
    });
  }

  loadPolicySummaryAndLedger(enquiryId: string): void {
    if (!enquiryId) return;
    if (this.isLoadingPolicySummary() || this.isLoadingLedger()) return;

    this.isLoadingPolicySummary.set(true);
    this.enquiryService.getPolicySummary(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingPolicySummary.set(false);
        if (res?.data) {
          this.policySummary.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingPolicySummary.set(false);
        console.warn('Failed to fetch policy summary:', err);
      },
    });

    this.isLoadingLedger.set(true);
    this.enquiryService.getLedgerPaymentDetails(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingLedger.set(false);
        if (res?.data) {
          this.ledgerDetails.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingLedger.set(false);
        console.warn('Failed to fetch ledger payment details:', err);
      },
    });
  }

  loadQrDetails(enquiryId: string): void {
    if (!enquiryId) return;
    if (this.isLoadingQr()) return;

    this.isLoadingQr.set(true);
    this.enquiryService.getPolicyQrDetails(enquiryId).subscribe({
      next: (res) => {
        this.isLoadingQr.set(false);
        if (res?.data) {
          this.qrDetails.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingQr.set(false);
        console.warn('Failed to fetch QR details:', err);
        this.errorMessage.set(
          err?.error?.message || 'Could not load bank QR coordinates from server.'
        );
      },
    });
  }

  setPaymentMethod(method: 'Ledger' | 'BankTransaction'): void {
    this.paymentMethod.set(method);
    this.errorMessage.set(null);
    if (method === 'BankTransaction') {
      const id = this.enquiryIdSignal();
      if (id && !this.qrDetails()) {
        this.loadQrDetails(id);
      }
    }
  }

  copyToClipboard(text: string, fieldName: string): void {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedField.set(fieldName);
        setTimeout(() => {
          if (this.copiedField() === fieldName) {
            this.copiedField.set(null);
          }
        }, 2000);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.copiedField.set(fieldName);
        setTimeout(() => this.copiedField.set(null), 2000);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  }

  proceedLedgerVerification(): void {
    if (this.effectiveReadOnly()) {
      return;
    }

    const enqId = this.enquiryIdSignal();
    const quoteId =
      this.policySummary()?.selectedQuoteId || this.quoteSignal()?.id || '';
    const amount = this.payableAmount();

    if (!this.hasSufficientBalance()) {
      this.errorMessage.set('Insufficient ledger balance to complete this transaction.');
      return;
    }

    this.isVerifyingLedger.set(true);
    this.errorMessage.set(null);

    const payload: SubmitPolicyRequestPayload = {
      quoteId: quoteId,
      enquiryId: enqId,
      useLedger: true,
      transactionId: null,
      bankAccountId: null,
      remarks: this.remark()?.trim() || 'Paid via Ledger',
    };

    this.enquiryService.submitPolicyRequest(payload).subscribe({
      next: (res) => {
        this.isVerifyingLedger.set(false);
        this.ledgerSuccess.set(true);
        this.successMessage.set(
          res?.message || `Policy payment of ₹${amount.toLocaleString('en-IN')} verified successfully from ledger!`
        );
        setTimeout(() => {
          this.paymentCompleted.emit({
            method: 'Ledger',
            amount: amount,
            status: 'Verified',
            enquiryId: enqId,
            quoteId: quoteId,
            response: res?.data,
          });
        }, 1200);
      },
      error: (err) => {
        this.isVerifyingLedger.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.message || 'Failed to submit policy request. Please try again.'
        );
      },
    });
  }

  onScreenshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.screenshotError.set(`File "${file.name}" exceeds the 10MB size limit.`);
      input.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (!isImage && !isPdf) {
      this.screenshotError.set('Please select an image file (JPG, PNG, WEBP) or a PDF receipt.');
      input.value = '';
      return;
    }

    this.screenshotError.set(null);
    this.errorMessage.set(null);

    if (this.paymentScreenshotPreviewUrl()) {
      try {
        URL.revokeObjectURL(this.paymentScreenshotPreviewUrl()!);
      } catch {}
    }

    let previewUrl: string | null = null;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {}

    this.paymentScreenshotFile.set(file);
    this.paymentScreenshotPreviewUrl.set(previewUrl);
    this.paymentScreenshotName.set(file.name);
    this.paymentScreenshotSize.set(file.size);
    this.isPdfScreenshot.set(isPdf);
    input.value = '';
  }

  removeScreenshot(): void {
    if (this.paymentScreenshotPreviewUrl()) {
      try {
        URL.revokeObjectURL(this.paymentScreenshotPreviewUrl()!);
      } catch {}
    }
    this.paymentScreenshotFile.set(null);
    this.paymentScreenshotPreviewUrl.set(null);
    this.paymentScreenshotName.set('');
    this.paymentScreenshotSize.set(0);
    this.isPdfScreenshot.set(false);
    this.screenshotError.set(null);
    this.showScreenshotModal.set(false);
  }

  openScreenshotModal(): void {
    if (this.paymentScreenshotPreviewUrl()) {
      this.showScreenshotModal.set(true);
    }
  }

  closeScreenshotModal(): void {
    this.showScreenshotModal.set(false);
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  submitBankTransaction(): void {
    if (this.effectiveReadOnly()) {
      return;
    }

    const txId = this.transactionId().trim();
    const utr = this.utrNumber().trim();
    const finalTxId = txId || utr;
    const enqId = this.enquiryIdSignal();
    const quoteId =
      this.policySummary()?.selectedQuoteId || this.quoteSignal()?.id || '';
    const bankAccountId = this.qrDetails()?.bankAccountId || null;
    const amount = this.payableAmount();
    const screenshotFile = this.paymentScreenshotFile();

    if (!finalTxId) {
      this.errorMessage.set('Please enter the Transaction ID / Bank Reference.');
      return;
    }

    if (!screenshotFile) {
      this.errorMessage.set('Payment screenshot is mandatory. Please upload your transaction receipt.');
      this.screenshotError.set('Payment screenshot is required.');
      return;
    }

    this.isSubmittingBank.set(true);
    this.errorMessage.set(null);
    this.screenshotError.set(null);

    let remarksText: string | null = null;
    if (this.remark().trim()) {
      remarksText = this.remark().trim();
      if (utr && utr !== txId) {
        remarksText += ` (UTR: ${utr})`;
      }
    } else if (utr && utr !== txId) {
      remarksText = `UTR: ${utr}`;
    }

    // Upload screenshot first if uploadDocument is available
    if (enqId && typeof (this.enquiryService as any).uploadDocument === 'function') {
      this.enquiryService
        .uploadDocument({
          enquiryId: enqId,
          docType: 'PaymentScreenshot' as any,
          docSide: 'Front',
          file: screenshotFile,
        })
        .subscribe({
          next: (uploadRes) => {
            const screenshotUrl = uploadRes?.data || null;
            this.finalizeBankPolicyRequest(
              {
                quoteId,
                enquiryId: enqId,
                useLedger: false,
                transactionId: finalTxId,
                bankAccountId,
                remarks: remarksText,
                paymentScreenshotUrl: screenshotUrl,
              },
              amount,
              finalTxId
            );
          },
          error: (uploadErr) => {
            console.warn(
              'Screenshot upload via uploadDocument failed, proceeding with policy request submission:',
              uploadErr
            );
            this.finalizeBankPolicyRequest(
              {
                quoteId,
                enquiryId: enqId,
                useLedger: false,
                transactionId: finalTxId,
                bankAccountId,
                remarks: remarksText,
              },
              amount,
              finalTxId
            );
          },
        });
    } else {
      this.finalizeBankPolicyRequest(
        {
          quoteId,
          enquiryId: enqId,
          useLedger: false,
          transactionId: finalTxId,
          bankAccountId,
          remarks: remarksText,
        },
        amount,
        finalTxId
      );
    }
  }

  private finalizeBankPolicyRequest(
    payload: SubmitPolicyRequestPayload,
    amount: number,
    finalTxId: string
  ): void {
    this.enquiryService.submitPolicyRequest(payload).subscribe({
      next: (res) => {
        this.isSubmittingBank.set(false);
        this.bankSuccess.set(true);
        this.successMessage.set(
          res?.message || `Bank transaction proof with reference ${finalTxId} submitted successfully!`
        );
        setTimeout(() => {
          this.paymentCompleted.emit({
            method: 'BankTransaction',
            amount: amount,
            status: 'PaymentVerificationPending',
            transactionId: finalTxId,
            enquiryId: payload.enquiryId,
            quoteId: payload.quoteId,
            response: res?.data,
            screenshotFile: this.paymentScreenshotFile(),
          });
        }, 1500);
      },
      error: (err) => {
        this.isSubmittingBank.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.message || 'Failed to submit bank transaction proof.'
        );
      },
    });
  }

  dismiss(): void {
    this.close.emit();
  }

  formatCurrency(amount?: number | null): string {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
