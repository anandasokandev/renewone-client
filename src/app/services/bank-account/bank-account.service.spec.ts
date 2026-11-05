import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BankAccountService } from './bank-account.service';
import { environment } from '../../../environments/environment';

describe('BankAccountService', () => {
  let service: BankAccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BankAccountService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BankAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get bank accounts with parameters', () => {
    service.getBankAccounts({ pageNumber: 1, pageSize: 10, search: 'Federal' }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].bankName).toBe('Federal Bank');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/bank-accounts` &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10' &&
        r.params.get('Search') === 'Federal'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      isSuccess: true,
      data: {
        items: [
          {
            id: '96abcd02-c76f-4547-8887-d55386d05308',
            accountName: 'VEN Rahul',
            bankName: 'Federal Bank',
            branchName: 'Muvattupuzha',
            accountHolderName: 'Rahul',
            accountNumber: '12100100077431',
            ifscCode: 'FDRL0001210',
            upiId: 'rahulsasi@upi',
            openingBalance: 0.0,
            currentBalance: -2070.0,
            isPrimary: true,
            isActive: true,
          },
        ],
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      message: 'Bank accounts fetched successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should toggle bank account status', () => {
    service.toggleBankAccountStatus('96abcd02').subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/bank-accounts/96abcd02/toggle-status`);
    expect(req.request.method).toBe('PUT');
    req.flush({
      isSuccess: true,
      data: null,
      message: 'Status updated successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should post createBankAccount with payload', () => {
    const payload = {
      accountName: 'ANAND TEST',
      bankName: 'ICICI Bank',
      branchName: 'Mumbai',
      accountNumber: '159744510308',
      ifscCode: 'ICICI000760',
      upiId: '',
      accountHolderName: 'Anand Asokan',
      isPrimary: false,
      isActive: true,
    };

    service.createBankAccount(payload).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/bank-accounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      isSuccess: true,
      data: 'new-acc-id',
      message: 'Bank account created successfully.',
      statusCode: 200,
      errors: null,
    });
  });
});

