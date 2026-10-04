import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Payments } from './payments';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import {
  QuoteItem,
  PolicySummaryData,
  LedgerPaymentDetailsData,
  PolicyQrDetailsData,
  SubmitPolicyRequestPayload,
} from '../../models/enquiry.model';

describe('Payments', () => {
  let component: Payments;
  let fixture: ComponentFixture<Payments>;
  let enquiryService: EnquiryService;

  let policySummaryCalledWith = '';
  let ledgerDetailsCalledWith = '';
  let qrDetailsCalledWith = '';
  let submittedPolicyPayload: SubmitPolicyRequestPayload | null = null;

  const mockQuote: QuoteItem = {
    id: 'quote-test-1',
    insuranceCompanyName: 'HDFC ERGO',
    idv: 450000,
    premium: 1120,
    agentPoints: 70,
    remarks: 'Comprehensive package',
    quoteDate: '2026-09-13T10:00:00Z',
    isSelected: true,
  };

  const mockPolicySummary: PolicySummaryData = {
    enquiryId: '4a1684d5-3eb5-4c2c-84f2-02bcaec740f3',
    selectedQuoteId: '7dd273f3-5598-4d25-8fe6-4e96f5b8d4e1',
    customerName: 'Rahul',
    mobile: '9744510308',
    address: 'Thodupuzha, Idukki, Kerala',
    vehicleNumber: 'KL38K0011',
    vehicle: 'Splendor Plus',
    vehicleType: 'Two Wheeler',
    fuelType: 'Petrol',
    insuranceCompany: 'HDFC ERGO',
    policyType: 'ThirdParty',
    premiumAmount: 1120,
    companyPayable: null,
    adminProfit: null,
    agentPayable: 1050,
    agentProfit: 70,
  };

  const mockLedgerDetails: LedgerPaymentDetailsData = {
    ledgerBalance: 1328,
    finalAmount: 1050,
    balanceAfterCut: 278,
  };

  const mockQrDetails: PolicyQrDetailsData = {
    qrMasterId: '751f27ac-8312-47d3-a66c-42e0753ed57f',
    qrName: 'Bike UPI',
    qrImageUrl: '',
    bankAccountId: '3cc0921c-ea26-4b34-b0aa-face397a9f40',
    bankName: 'SBI',
    branchName: 'Ernakulam',
    accountHolderName: 'Arun',
    accountNumber: '12100100077431',
    ifscCode: 'SBIN0070564',
    upiId: 'anandasokan@upi',
  };

  beforeEach(async () => {
    policySummaryCalledWith = '';
    ledgerDetailsCalledWith = '';
    qrDetailsCalledWith = '';
    submittedPolicyPayload = null;

    await TestBed.configureTestingModule({
      imports: [Payments],
      providers: [provideHttpClient()],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);

    (enquiryService as any).getPolicySummary = (enqId: string) => {
      policySummaryCalledWith = enqId;
      return of({ isSuccess: true, data: mockPolicySummary, statusCode: 200, message: 'Success', errors: null });
    };

    (enquiryService as any).getLedgerPaymentDetails = (enqId: string) => {
      ledgerDetailsCalledWith = enqId;
      return of({ isSuccess: true, data: mockLedgerDetails, statusCode: 200, message: 'Success', errors: null });
    };

    (enquiryService as any).getPolicyQrDetails = (enqId: string) => {
      qrDetailsCalledWith = enqId;
      return of({ isSuccess: true, data: mockQrDetails, statusCode: 200, message: 'Success', errors: null });
    };

    (enquiryService as any).submitPolicyRequest = (payload: SubmitPolicyRequestPayload) => {
      submittedPolicyPayload = payload;
      return of({ isSuccess: true, data: { status: 'Submitted' }, statusCode: 200, message: 'Policy request submitted successfully', errors: null });
    };

    (enquiryService as any).getQuotePaymentSummary = (enqId: string) => {
      return of({ isSuccess: true, data: null, statusCode: 200, message: 'Success', errors: null });
    };

    (enquiryService as any).uploadDocument = (payload: any) => {
      return of({ isSuccess: true, data: 'https://example.com/receipt.jpg', statusCode: 200, message: 'Uploaded', errors: null });
    };

    fixture = TestBed.createComponent(Payments);
    component = fixture.componentInstance;
    component.enquiryId = '4a1684d5-3eb5-4c2c-84f2-02bcaec740f3';
    component.quote = mockQuote;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create the Payments component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to Ledger payment method and load policy summary & ledger details on init', () => {
    expect(component.paymentMethod()).toBe('Ledger');
    expect(policySummaryCalledWith).toBe('4a1684d5-3eb5-4c2c-84f2-02bcaec740f3');
    expect(ledgerDetailsCalledWith).toBe('4a1684d5-3eb5-4c2c-84f2-02bcaec740f3');
    expect(component.policySummary()?.customerName).toBe('Rahul');
    expect(component.policySummary()?.selectedQuoteId).toBe('7dd273f3-5598-4d25-8fe6-4e96f5b8d4e1');
    expect(component.ledgerDetails()?.ledgerBalance).toBe(1328);
  });

  it('should compute payable amount and remaining balance accurately from live API data', () => {
    expect(component.payableAmount()).toBe(1050);
    expect(component.hasSufficientBalance()).toBe(true);
    expect(component.remainingBalance()).toBe(278);
  });

  it('should switch payment method to BankTransaction and load QR details', () => {
    component.setPaymentMethod('BankTransaction');
    expect(component.paymentMethod()).toBe('BankTransaction');
    expect(qrDetailsCalledWith).toBe('4a1684d5-3eb5-4c2c-84f2-02bcaec740f3');
    expect(component.qrDetails()?.upiId).toBe('anandasokan@upi');
  });

  it('should build dynamic UPI URI based on upiId from QR API', () => {
    component.setPaymentMethod('BankTransaction');
    const uri = component.upiUri();
    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=anandasokan@upi');
    expect(uri).toContain('pn=Arun');
    expect(uri).toContain('am=1050');
    expect(uri).toContain('4a1684d5');
  });

  it('should detect insufficient ledger balance when balanceAfterCut is negative', () => {
    component.ledgerDetails.set({
      ledgerBalance: 500,
      finalAmount: 1050,
      balanceAfterCut: -550,
    });
    expect(component.hasSufficientBalance()).toBe(false);

    component.proceedLedgerVerification();
    expect(component.errorMessage()).toContain('Insufficient ledger balance');
  });

  it('should submit policy request with useLedger true and selectedQuoteId when ledger balance is sufficient', () => {
    let emittedResult: any = null;
    component.paymentCompleted.subscribe((res) => {
      emittedResult = res;
    });

    component.proceedLedgerVerification();
    expect(component.ledgerSuccess()).toBe(true);
    expect(submittedPolicyPayload).toBeTruthy();
    expect(submittedPolicyPayload?.useLedger).toBe(true);
    expect(submittedPolicyPayload?.quoteId).toBe('7dd273f3-5598-4d25-8fe6-4e96f5b8d4e1');
    expect(submittedPolicyPayload?.enquiryId).toBe('4a1684d5-3eb5-4c2c-84f2-02bcaec740f3');
    expect(submittedPolicyPayload?.transactionId).toBeNull();
    expect(submittedPolicyPayload?.bankAccountId).toBeNull();
  });

  it('should validate bank transaction requiring transactionId and mandatory paymentScreenshot', () => {
    component.setPaymentMethod('BankTransaction');
    component.transactionId.set('');
    component.paymentScreenshotFile.set(null);

    component.submitBankTransaction();
    expect(component.errorMessage()).toContain('Transaction ID');

    component.transactionId.set('TXN-12345');
    component.submitBankTransaction();
    expect(component.errorMessage()).toContain('Payment screenshot is mandatory');
    expect(component.screenshotError()).toBe('Payment screenshot is required.');
  });

  it('should submit policy request with useLedger false, bankAccountId, and transactionId proof', () => {
    component.setPaymentMethod('BankTransaction');
    component.transactionId.set('TXN-92817401');
    component.remark.set('Payment from SBI account');
    const dummyFile = new File(['dummy-receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    component.paymentScreenshotFile.set(dummyFile);

    component.submitBankTransaction();
    expect(component.bankSuccess()).toBe(true);
    expect(submittedPolicyPayload).toBeTruthy();
    expect(submittedPolicyPayload?.useLedger).toBe(false);
    expect(submittedPolicyPayload?.quoteId).toBe('7dd273f3-5598-4d25-8fe6-4e96f5b8d4e1');
    expect(submittedPolicyPayload?.enquiryId).toBe('4a1684d5-3eb5-4c2c-84f2-02bcaec740f3');
    expect(submittedPolicyPayload?.transactionId).toBe('TXN-92817401');
    expect(submittedPolicyPayload?.bankAccountId).toBe('3cc0921c-ea26-4b34-b0aa-face397a9f40');
    expect(submittedPolicyPayload?.paymentScreenshotUrl).toBe('https://example.com/receipt.jpg');
  });

  it('should handle screenshot selection, modal preview, and removal', () => {
    const dummyFile = new File(['content'], 'screenshot.png', { type: 'image/png' });
    const event = {
      target: {
        files: [dummyFile],
        value: 'screenshot.png',
      },
    } as any;

    component.onScreenshotSelected(event);
    expect(component.paymentScreenshotFile()).toBe(dummyFile);
    expect(component.paymentScreenshotName()).toBe('screenshot.png');
    expect(component.isPdfScreenshot()).toBe(false);

    expect(component.showScreenshotModal()).toBe(false);
    component.openScreenshotModal();
    expect(component.showScreenshotModal()).toBe(true);
    component.closeScreenshotModal();
    expect(component.showScreenshotModal()).toBe(false);

    component.removeScreenshot();
    expect(component.paymentScreenshotFile()).toBeNull();
    expect(component.paymentScreenshotPreviewUrl()).toBeNull();
    expect(component.paymentScreenshotName()).toBe('');
  });

  it('should emit close when dismiss is called', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    component.dismiss();
    expect(closed).toBe(true);
  });

  it('should enter view-only mode when payment has already been submitted and prevent submissions', () => {
    // Set payment summary as returned by /api/Enquiry/admin/quote-summary/{enquiryId}
    component.quotePaymentSummary.set({
      enquiryId: '4a1684d5-3eb5-4c2c-84f2-02bcaec740f3',
      paymentMode: 'Ledger',
      amount: 1195,
      referenceNumber: 'PP33',
      agentLedgerName: 'Anand Asokan',
      currentBalance: 213,
      remarks: 'Paid via Ledger',
    });

    expect(component.effectiveReadOnly()).toBe(true);
    expect(component.payableAmount()).toBe(1195);

    // Reset submitted payload tracker
    submittedPolicyPayload = null;

    // In view-only mode, proceedLedgerVerification should not submit anything
    component.proceedLedgerVerification();
    expect(submittedPolicyPayload).toBeNull();
    expect(component.ledgerSuccess()).toBe(false);

    // In view-only mode, submitBankTransaction should not submit anything
    component.setPaymentMethod('BankTransaction');
    component.transactionId.set('TXN-999');
    component.submitBankTransaction();
    expect(submittedPolicyPayload).toBeNull();
    expect(component.bankSuccess()).toBe(false);
  });
});
