import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { QuoteFilterParams, QuoteItem, QuotePagedResult, QuotePaymentSummaryData } from '../../models/enquiry.model';
import { Payments } from '../payments/payments';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Payments],
  templateUrl: './quotes.html',
  styleUrl: './quotes.css',
})
export class Quotes implements OnInit, OnChanges {
  private enquiryService = inject(EnquiryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() enquiryId?: string;
  @Input() isModalView: boolean = false;

  @Output() quoteSelected = new EventEmitter<QuoteItem>();
  @Output() dismissed = new EventEmitter<void>();

  // State Signals
  activeEnquiryId = signal<string>('');
  quotes = signal<QuoteItem[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  selectedQuoteId = signal<string | null>(null);
  searchQuery = signal<string>('');
  sortBy = signal<string>('agentPoints');
  sortDescending = signal<boolean>(true);

  // Payment Status & Lock State (/api/Enquiry/admin/quote-summary/{enquiryId})
  paymentSummary = signal<QuotePaymentSummaryData | null>(null);
  isLoadingPaymentSummary = signal<boolean>(false);
  isPaymentAlreadySubmitted = computed<boolean>(() => {
    const ps = this.paymentSummary();
    if (!ps) return false;
    return !!(ps.paymentMode || ps.referenceNumber || ps.transactionId || ps.ledgerPaymentTime || ps.paymentDate);
  });

  // Payment Modal & Quote Submission State
  showPaymentModal = signal<boolean>(false);
  isSubmittingQuote = signal<boolean>(false);

  // Pagination State
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = signal<number>(1);

  // View Mode: 'cards' or 'table' (defaults to table view)
  viewMode = signal<'cards' | 'table'>('table');

  // Computed Properties
  selectedQuote = computed<QuoteItem | null>(() => {
    const id = this.selectedQuoteId();
    if (!id) return null;
    return this.quotes().find((q) => q.id === id) || null;
  });

  // Best Quote Suggestion based on highest agentPoints
  bestQuote = computed<QuoteItem | null>(() => {
    const items = this.quotes();
    if (!items || items.length === 0) return null;

    return [...items].sort((a, b) => {
      if (b.agentPoints !== a.agentPoints) {
        return b.agentPoints - a.agentPoints;
      }
      return a.premium - b.premium; // secondary tiebreaker: lowest premium
    })[0];
  });

  highestAgentPoints = computed<number>(() => {
    return this.bestQuote()?.agentPoints ?? 0;
  });

  lowestPremium = computed<number>(() => {
    const items = this.quotes();
    if (!items || items.length === 0) return 0;
    return Math.min(...items.map((q) => q.premium));
  });

  lowestPremiumQuoteId = computed<string | null>(() => {
    const items = this.quotes();
    if (!items || items.length === 0) return null;
    const minQuote = [...items].sort((a, b) => a.premium - b.premium)[0];
    return minQuote?.id ?? null;
  });

  totalQuotesCount = computed<number>(() => {
    return this.quotes().length;
  });

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadQuotes();
  }

  ngOnInit(): void {
    if (this.enquiryId) {
      this.activeEnquiryId.set(this.enquiryId);
      this.loadQuotes();
    } else {
      this.route.queryParams.subscribe((params) => {
        const idFromRoute = params['enquiryId'];
        if (idFromRoute) {
          this.activeEnquiryId.set(idFromRoute);
          this.loadQuotes();
        } else {
          // If no ID passed, try fallback demo enquiry ID
          this.activeEnquiryId.set('a5cb9a58-41c4-4c92-9c90-493c5437e6c4');
          this.loadQuotes();
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enquiryId'] && !changes['enquiryId'].firstChange) {
      const newId = changes['enquiryId'].currentValue;
      if (newId) {
        this.activeEnquiryId.set(newId);
        this.loadQuotes();
      }
    }
  }

  loadQuotes(): void {
    const id = this.activeEnquiryId();
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Concurrently check if payment was already submitted for this enquiry
    this.loadPaymentSummary(id);

    const params: QuoteFilterParams = {
      enquiryId: id,
      search: this.searchQuery().trim() || undefined,
      sortBy: this.sortBy(),
      sortDescending: this.sortDescending(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
    };

    this.enquiryService.getVehicleQuotes(params).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const data = res.data;
        if (data && Array.isArray(data.items)) {
          this.quotes.set(data.items);
          this.totalCount.set(data.totalCount || data.items.length);
          this.totalPages.set(data.totalPages || 1);

          // If a quote was already marked selected from server, highlight it
          const preSelected = data.items.find((q) => q.isSelected);
          if (preSelected) {
            this.selectedQuoteId.set(preSelected.id);
          } else if (!this.selectedQuoteId() && this.bestQuote()) {
            // Suggest the best quote by default
            this.selectedQuoteId.set(this.bestQuote()!.id);
          }
        } else {
          this.quotes.set([]);
        }
      },
      error: (err) => {
        console.warn('API /api/VehicleEnquiry/quotes error, populating fallback proposals for demo:', err);
        this.isLoading.set(false);

        // Resilient fallback sample data so UI/UX remains testable and responsive offline
        const fallbackQuotes: QuoteItem[] = [
          {
            id: '86203efc-37d7-4976-8ae3-9cf2759d4cac',
            insuranceCompanyName: 'ICICI Lombard',
            idv: 450000,
            premium: 1165,
            agentPoints: 75,
            remarks: 'Zero depreciation + 24x7 Roadside Assistance included',
            quoteDate: new Date().toISOString(),
            isSelected: false,
          },
          {
            id: '7b914fac-22d1-4f11-9bf1-8629014dac11',
            insuranceCompanyName: 'HDFC ERGO General Insurance',
            idv: 465000,
            premium: 1240,
            agentPoints: 90,
            remarks: 'Comprehensive package with engine protector cover',
            quoteDate: new Date(Date.now() - 3600000).toISOString(),
            isSelected: false,
          },
          {
            id: '5a109e22-11c2-4822-8cc2-7102938eb922',
            insuranceCompanyName: 'Tata AIG General Insurance',
            idv: 440000,
            premium: 1095,
            agentPoints: 60,
            remarks: 'Standard third-party liability with NCB retention cover',
            quoteDate: new Date(Date.now() - 7200000).toISOString(),
            isSelected: false,
          },
          {
            id: '3c829011-88f4-4190-bdf1-61029381ea55',
            insuranceCompanyName: 'Bajaj Allianz General Insurance',
            idv: 455000,
            premium: 1190,
            agentPoints: 85,
            remarks: 'Express cashless claim settlement at 4,000+ garages',
            quoteDate: new Date(Date.now() - 10800000).toISOString(),
            isSelected: false,
          },
        ];

        this.quotes.set(fallbackQuotes);
        this.totalCount.set(fallbackQuotes.length);
        if (this.bestQuote()) {
          this.selectedQuoteId.set(this.bestQuote()!.id);
        }
      },
    });
  }

  loadPaymentSummary(enquiryId?: string): void {
    const id = enquiryId || this.activeEnquiryId();
    if (!id) return;

    this.isLoadingPaymentSummary.set(true);
    this.enquiryService.getQuotePaymentSummary(id).subscribe({
      next: (res) => {
        this.isLoadingPaymentSummary.set(false);
        const data = res?.data;
        if (data && (data.paymentMode || data.referenceNumber || data.transactionId || data.ledgerPaymentTime || data.paymentDate || (data.amount && data.amount > 0))) {
          this.paymentSummary.set(data);
        } else {
          this.paymentSummary.set(null);
        }
      },
      error: () => {
        this.isLoadingPaymentSummary.set(false);
        this.paymentSummary.set(null);
      },
    });
  }

  selectQuote(quote: QuoteItem): void {
    if (this.isPaymentAlreadySubmitted()) {
      return; // Lock editing when payment is already submitted
    }
    this.selectedQuoteId.set(quote.id);
  }

  selectBestQuote(): void {
    if (this.isPaymentAlreadySubmitted()) {
      return; // Lock editing when payment is already submitted
    }
    const best = this.bestQuote();
    if (best) {
      this.selectedQuoteId.set(best.id);
    }
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.pageNumber.set(1);
    this.loadQuotes();
  }

  setSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDescending.update((desc) => !desc);
    } else {
      this.sortBy.set(field);
      this.sortDescending.set(field === 'agentPoints' || field === 'premium' ? false : true);
    }
    this.loadQuotes();
  }

  setViewMode(mode: 'cards' | 'table'): void {
    this.viewMode.set(mode);
  }

  confirmSelection(): void {
    const quote = this.selectedQuote();
    const enquiryId = this.activeEnquiryId();
    if (!quote) return;

    // If payment is already submitted, only allow viewing payment without re-submitting quote selection
    if (this.isPaymentAlreadySubmitted()) {
      this.showPaymentModal.set(true);
      return;
    }

    this.isSubmittingQuote.set(true);
    this.errorMessage.set(null);

    // Call /api/VehicleEnquiry/{enquiryId}/quotes/{quoteId}/submit
    this.enquiryService.submitQuoteSelection(enquiryId, quote.id).subscribe({
      next: () => {
        this.isSubmittingQuote.set(false);
        this.quoteSelected.emit(quote);
        this.successMessage.set(`Quote submitted successfully for ${quote.insuranceCompanyName}!`);
        this.showPaymentModal.set(true);
      },
      error: (err) => {
        console.warn('API /api/VehicleEnquiry/{enquiryId}/quotes/{quoteId}/submit fallback:', err);
        this.isSubmittingQuote.set(false);
        this.quoteSelected.emit(quote);
        this.successMessage.set(`Quote selected for ${quote.insuranceCompanyName}. Opening payment options...`);
        this.showPaymentModal.set(true);
      },
    });
  }

  onPaymentModalClose(): void {
    this.showPaymentModal.set(false);
  }

  onPaymentCompleted(result: any): void {
    this.showPaymentModal.set(false);
    const enquiryId = this.activeEnquiryId();
    this.enquiryService.updateStatus(enquiryId, 'PaymentVerificationPending');
    this.loadPaymentSummary(enquiryId);

    const methodLabel = result.method === 'Ledger' ? 'Agency Ledger' : 'Bank Transaction';
    this.successMessage.set(
      `Payment submitted via ${methodLabel}! Status updated to Payment Verification Pending.`
    );

    setTimeout(() => {
      this.successMessage.set(null);
      if (!this.isModalView) {
        this.router.navigate(['/enquiry'], {
          queryParams: {
            status: 'PaymentVerificationPending',
            enquiryId: enquiryId,
          },
        });
      } else {
        this.dismiss();
      }
    }, 1500);
  }

  dismiss(): void {
    this.dismissed.emit();
  }

  formatCurrency(amount?: number | null): string {
    if (amount === null || amount === undefined) return 'Standard / Included';
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getCompanyInitials(name: string): string {
    if (!name) return 'IN';
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
