import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Quotes } from './quotes';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { QuoteItem, QuotePagedResult } from '../../models/enquiry.model';
import { ApiResponse } from '../../models/response.model';

describe('Quotes', () => {
  let component: Quotes;
  let fixture: ComponentFixture<Quotes>;
  let enquiryService: EnquiryService;
  let getVehicleQuotesCallCount = 0;
  let lastParamsReceived: any = null;

  const mockQuotes: QuoteItem[] = [
    {
      id: 'quote-1',
      insuranceCompanyName: 'ICICI Lombard',
      idv: 45000,
      premium: 1450,
      agentPoints: 85,
      remarks: 'Comprehensive Plan with Roadside Assistance',
      quoteDate: '2026-09-12T18:00:00Z',
      isSelected: false,
    },
    {
      id: 'quote-2',
      insuranceCompanyName: 'HDFC ERGO',
      idv: 48000,
      premium: 1620,
      agentPoints: 120, // Highest agent points -> Best quote
      remarks: 'Zero Depreciation + Consumables included',
      quoteDate: '2026-09-12T18:05:00Z',
      isSelected: false,
    },
    {
      id: 'quote-3',
      insuranceCompanyName: 'Bajaj Allianz',
      idv: 42000,
      premium: 1199, // Lowest premium
      agentPoints: 60,
      remarks: 'Standard Third Party + Own Damage cover',
      quoteDate: '2026-09-12T18:10:00Z',
      isSelected: false,
    },
  ];

  const mockPagedResponse: ApiResponse<QuotePagedResult> = {
    isSuccess: true,
    data: {
      items: mockQuotes,
      pageNumber: 1,
      pageSize: 10,
      totalCount: 3,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: 'Quotes retrieved successfully',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    getVehicleQuotesCallCount = 0;
    lastParamsReceived = null;

    await TestBed.configureTestingModule({
      imports: [Quotes],
      providers: [
        provideRouter([]),
        provideHttpClient(),
      ],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    (enquiryService as any).getVehicleQuotes = (params: any) => {
      getVehicleQuotesCallCount++;
      lastParamsReceived = params;
      return of(mockPagedResponse);
    };
    (enquiryService as any).submitQuoteSelection = (enqId: string, qId: string) => {
      return of({ isSuccess: true, data: { status: 'Success' }, statusCode: 200, message: 'Quote submitted' });
    };
    (enquiryService as any).getQuotePaymentSummary = (enqId: string) => {
      return of({ isSuccess: true, data: null, statusCode: 200, message: 'No payment yet', errors: null });
    };

    fixture = TestBed.createComponent(Quotes);
    component = fixture.componentInstance;
    component.enquiryId = 'test-enquiry-123';
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the Quotes component', () => {
    expect(component).toBeTruthy();
  });

  it('should load quotes on initialization and set active quotes list', () => {
    expect(getVehicleQuotesCallCount).toBeGreaterThan(0);
    expect(component.quotes().length).toBe(3);
  });

  it('should accurately calculate bestQuote with highest agentPoints', () => {
    const best = component.bestQuote();
    expect(best).toBeTruthy();
    expect(best?.id).toBe('quote-2');
    expect(best?.insuranceCompanyName).toBe('HDFC ERGO');
    expect(best?.agentPoints).toBe(120);
    expect(component.highestAgentPoints()).toBe(120);
  });

  it('should accurately calculate lowestPremium', () => {
    expect(component.lowestPremium()).toBe(1199);
  });

  it('should select a quote when selectQuote is invoked', () => {
    component.selectQuote(mockQuotes[0]);
    expect(component.selectedQuoteId()).toBe('quote-1');
    expect(component.selectedQuote()?.insuranceCompanyName).toBe('ICICI Lombard');
  });

  it('should select best quote when selectBestQuote is invoked', () => {
    component.selectQuote(mockQuotes[0]);
    expect(component.selectedQuoteId()).toBe('quote-1');

    component.selectBestQuote();
    expect(component.selectedQuoteId()).toBe('quote-2');
  });

  it('should call submitQuoteSelection and open Payments modal when confirmSelection is invoked', () => {
    let emittedQuote: QuoteItem | null = null;
    let submitQuoteCalledWith: { enqId: string; qId: string } | null = null;
    (enquiryService as any).submitQuoteSelection = (enqId: string, qId: string) => {
      submitQuoteCalledWith = { enqId, qId };
      return of({ isSuccess: true, data: { status: 'Success' }, statusCode: 200, message: 'Quote submitted' });
    };

    component.quoteSelected.subscribe((q) => {
      emittedQuote = q;
    });

    component.selectQuote(mockQuotes[1]);
    expect(component.showPaymentModal()).toBe(false);

    component.confirmSelection();

    expect(submitQuoteCalledWith).toEqual({ enqId: 'test-enquiry-123', qId: 'quote-2' });
    expect(emittedQuote).toEqual(mockQuotes[1]);
    expect(component.showPaymentModal()).toBe(true);
  });

  it('should lock quotes and prevent editing when payment is already submitted', () => {
    // Set payment summary as returned by /api/Enquiry/admin/quote-summary/{enquiryId}
    component.paymentSummary.set({
      enquiryId: 'test-enquiry-123',
      paymentMode: 'Ledger',
      amount: 1195,
      referenceNumber: 'PP33',
      remarks: 'Paid via Ledger',
    });

    expect(component.isPaymentAlreadySubmitted()).toBe(true);

    // Initial selected quote
    component.selectedQuoteId.set('quote-1');

    // Attempting to select another quote should be ignored
    component.selectQuote(mockQuotes[2]);
    expect(component.selectedQuoteId()).toBe('quote-1');

    // Attempting to select best quote should be ignored
    component.selectBestQuote();
    expect(component.selectedQuoteId()).toBe('quote-1');

    // Confirm selection in locked mode should open modal directly without calling submitQuoteSelection API
    let submitCalled = false;
    (enquiryService as any).submitQuoteSelection = () => {
      submitCalled = true;
      return of({ isSuccess: true });
    };

    component.confirmSelection();
    expect(submitCalled).toBe(false);
    expect(component.showPaymentModal()).toBe(true);
  });

  it('should toggle view mode between table and cards', () => {
    expect(component.viewMode()).toBe('table');
    component.setViewMode('cards');
    expect(component.viewMode()).toBe('cards');
    component.setViewMode('table');
    expect(component.viewMode()).toBe('table');
  });

  it('should update sorting and trigger quote reload', () => {
    const priorCalls = getVehicleQuotesCallCount;
    component.setSort('premium');
    expect(component.sortBy()).toBe('premium');
    expect(getVehicleQuotesCallCount).toBe(priorCalls + 1);
    expect(lastParamsReceived.sortBy).toBe('premium');
  });

  it('should emit dismissed when dismiss() is called in modal view', () => {
    let dismissedCalled = false;
    component.dismissed.subscribe(() => {
      dismissedCalled = true;
    });

    component.isModalView = true;
    component.dismiss();
    expect(dismissedCalled).toBe(true);
  });

  it('should accurately calculate lowestPremiumQuoteId', () => {
    expect(component.lowestPremiumQuoteId()).toBe('quote-3'); // quote-3 has premium 1199
  });

  it('should clear search query and reload quotes when clearSearch is called', () => {
    component.searchQuery.set('ICICI');
    component.pageNumber.set(2);
    const priorCalls = getVehicleQuotesCallCount;

    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(component.pageNumber()).toBe(1);
    expect(getVehicleQuotesCallCount).toBe(priorCalls + 1);
  });

  it('should hide best quote banner when payment is already submitted', () => {
    fixture.detectChanges();
    let banner = fixture.nativeElement.querySelector('.best-quote-banner');
    expect(banner).toBeTruthy();

    component.paymentSummary.set({
      enquiryId: 'enq-123',
      paymentMode: 'Ledger',
      amount: 1195,
      remarks: 'Paid via Ledger',
      agentLedgerName: 'Anand Asokan',
      agentTotalLimit: 10100,
      currentBalance: 213,
      referenceNumber: 'PP33',
      transactionId: null,
      ledgerPaymentTime: '2026-09-13T11:08:09',
      verifiedByName: null,
      verifiedAt: null,
      accountName: null,
      upiId: null,
      accountNumber: null,
      ifsc: null,
      paymentDate: null,
    });
    fixture.detectChanges();

    banner = fixture.nativeElement.querySelector('.best-quote-banner');
    expect(banner).toBeNull();
  });
});

