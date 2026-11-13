import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BankAccountManagement } from './bank-account-management';
import { BankAccountService } from '../../../../services/bank-account/bank-account.service';
import { ApiResponse } from '../../../../models/response.model';
import { PagedResult } from '../../../../models/qr.model';
import { BankAccountItem } from '../../../../models/bank-account.model';

describe('BankAccountManagement', () => {
  let component: BankAccountManagement;
  let fixture: ComponentFixture<BankAccountManagement>;
  let bankAccountService: BankAccountService;

  const mockBankAccountsData: ApiResponse<PagedResult<BankAccountItem>> = {
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
        {
          id: 'b66b7202-8462-41c8-9aff-d07bf321d378',
          accountName: 'Car UPI',
          bankName: 'ICICI',
          branchName: 'Thodupuzha',
          accountHolderName: 'Anand',
          accountNumber: '587896587458',
          ifscCode: 'ICICI000331',
          upiId: '',
          openingBalance: 0.0,
          currentBalance: -14750.0,
          isPrimary: false,
          isActive: false,
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: 'Bank accounts fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankAccountManagement],
      providers: [BankAccountService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    bankAccountService = TestBed.inject(BankAccountService);
    vi.spyOn(bankAccountService, 'getBankAccounts').mockReturnValue(of(mockBankAccountsData));

    fixture = TestBed.createComponent(BankAccountManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load bank accounts on init and render table rows', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.accounts().length).toBe(2);
    expect(component.totalRecords()).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    // Row 1 checks
    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('VEN Rahul');
    expect(firstRowText).toContain('PRIMARY');
    expect(firstRowText).toContain('Rahul');
    expect(firstRowText).toContain('rahulsasi@upi');
    expect(firstRowText).toContain('Federal Bank');
    expect(firstRowText).toContain('Muvattupuzha');
    expect(firstRowText).toContain('12100100077431');
    expect(firstRowText).toContain('FDRL0001210');
    expect(firstRowText).toContain('Active');
  });

  it('should filter bank accounts by search query', () => {
    component.onSearchChange('ICICI');
    expect(component.filteredAccounts().length).toBe(1);
    expect(component.filteredAccounts()[0].bankName).toBe('ICICI');

    component.onSearchChange('NonExistent');
    expect(component.filteredAccounts().length).toBe(0);

    component.clearSearch();
    expect(component.filteredAccounts().length).toBe(2);
  });

  it('should toggle bank account status', () => {
    const toggleSpy = vi
      .spyOn(bankAccountService, 'toggleBankAccountStatus')
      .mockReturnValue(of({ isSuccess: true, data: null, message: 'Status updated', statusCode: 200, errors: null }));

    const account = component.accounts()[0];
    expect(account.isActive).toBe(true);

    component.onToggleStatus(account);

    expect(toggleSpy).toHaveBeenCalledWith('96abcd02-c76f-4547-8887-d55386d05308');
    expect(component.accounts()[0].isActive).toBe(false);
  });

  it('should handle refresh action', () => {
    const loadSpy = vi.spyOn(component, 'loadBankAccounts');
    component.refreshBankAccounts();
    expect(loadSpy).toHaveBeenCalled();
    expect(component.toastMessage()).toBe('Bank accounts refreshed.');
  });

  it('should handle pagination changes', () => {
    const loadSpy = vi.spyOn(component, 'loadBankAccounts');
    component.onPageSizeChange(25);
    expect(component.pageSize()).toBe(25);
    expect(loadSpy).toHaveBeenCalled();
  });

  describe('Add Bank Account Modal', () => {
    it('should open modal and initialize with default values', () => {
      expect(component.isAddModalOpen()).toBe(false);
      component.openAddAccountModal();

      expect(component.isAddModalOpen()).toBe(true);
      expect(component.addAccountForm.controls.isPrimary.value).toBe(false);
      expect(component.addAccountForm.controls.isActive.value).toBe(true);
      expect(component.addError()).toBeNull();
    });

    it('should close modal and reset form', () => {
      component.openAddAccountModal();
      component.addAccountForm.controls.accountName.setValue('TEMP');
      component.closeAddAccountModal();

      expect(component.isAddModalOpen()).toBe(false);
      expect(component.addAccountForm.controls.accountName.value).toBe('');
    });

    it('should validate form and prevent submission when required fields are empty', () => {
      const createSpy = vi.spyOn(bankAccountService, 'createBankAccount');
      component.openAddAccountModal();

      expect(component.addAccountForm.valid).toBe(false);
      component.submitAddAccount();

      expect(createSpy).not.toHaveBeenCalled();
      expect(component.addAccountForm.controls.accountName.touched).toBe(true);
      expect(component.addAccountForm.controls.bankName.touched).toBe(true);
      expect(component.addAccountForm.controls.branchName.touched).toBe(true);
      expect(component.addAccountForm.controls.accountNumber.touched).toBe(true);
      expect(component.addAccountForm.controls.ifscCode.touched).toBe(true);
      expect(component.addAccountForm.controls.accountHolderName.touched).toBe(true);
    });

    it('should submit valid form with expected payload, close modal, and refresh accounts list', () => {
      const createSpy = vi.spyOn(bankAccountService, 'createBankAccount').mockReturnValue(
        of({
          isSuccess: true,
          data: 'new-id',
          message: 'Bank account created successfully.',
          statusCode: 200,
          errors: null,
        })
      );
      const loadSpy = vi.spyOn(component, 'loadBankAccounts');

      component.openAddAccountModal();
      component.addAccountForm.setValue({
        accountName: 'ANAND TEST',
        bankName: 'ICICI Bank',
        branchName: 'Mumbai',
        accountNumber: '159744510308',
        ifscCode: 'ICICI000760',
        upiId: '',
        accountHolderName: 'Anand Asokan',
        isPrimary: false,
        isActive: true,
      });

      expect(component.addAccountForm.valid).toBe(true);
      component.submitAddAccount();

      expect(createSpy).toHaveBeenCalledWith({
        accountName: 'ANAND TEST',
        bankName: 'ICICI Bank',
        branchName: 'Mumbai',
        accountNumber: '159744510308',
        ifscCode: 'ICICI000760',
        upiId: '',
        accountHolderName: 'Anand Asokan',
        isPrimary: false,
        isActive: true,
      });
      expect(component.isAddModalOpen()).toBe(false);
      expect(component.toastMessage()).toBe('Bank account created successfully.');
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should handle API error on create', () => {
      vi.spyOn(bankAccountService, 'createBankAccount').mockReturnValue(
        throwError(() => ({
          error: { message: 'Account number already registered.' },
        }))
      );

      component.openAddAccountModal();
      component.addAccountForm.setValue({
        accountName: 'ANAND TEST',
        bankName: 'ICICI Bank',
        branchName: 'Mumbai',
        accountNumber: '159744510308',
        ifscCode: 'ICICI000760',
        upiId: '',
        accountHolderName: 'Anand Asokan',
        isPrimary: false,
        isActive: true,
      });

      component.submitAddAccount();

      expect(component.isAddModalOpen()).toBe(true);
      expect(component.addError()).toBe('Account number already registered.');
      expect(component.isSubmitting()).toBe(false);
    });
  });

  describe('Status Filtering & Mobile Cards & Infinite Scroll', () => {
    it('should filter bank accounts by status', () => {
      expect(component.accounts().length).toBe(2);
      expect(component.filteredAccounts().length).toBe(2);
      expect(component.activeAccountsCount()).toBe(1);
      expect(component.inactiveAccountsCount()).toBe(1);

      component.setStatusFilter('active');
      expect(component.filteredAccounts().length).toBe(1);
      expect(component.filteredAccounts()[0].isActive).toBe(true);

      component.setStatusFilter('inactive');
      expect(component.filteredAccounts().length).toBe(1);
      expect(component.filteredAccounts()[0].isActive).toBe(false);

      component.setStatusFilter('all');
      expect(component.filteredAccounts().length).toBe(2);
    });

    it('should render mobile card view matching design', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      const mobileList = compiled.querySelector('.bank-mobile-list');
      expect(mobileList).toBeTruthy();

      const cards = mobileList?.querySelectorAll('.bank-mobile-card');
      expect(cards?.length).toBe(2);

      const firstCard = cards?.[0];
      expect(firstCard?.textContent).toContain('VEN Rahul');
      expect(firstCard?.textContent).toContain('Federal Bank');
      expect(firstCard?.textContent).toContain('12100100077431');
      expect(firstCard?.textContent).toContain('FDRL0001210');
      expect(firstCard?.textContent).toContain('Primary');
    });

    it('should append records when loadMoreAccounts is called', () => {
      const nextPageData: ApiResponse<PagedResult<BankAccountItem>> = {
        isSuccess: true,
        data: {
          items: [
            {
              id: 'new-account-id',
              accountName: 'SBI Branch',
              bankName: 'State Bank of India',
              branchName: 'Kochi',
              accountHolderName: 'Kochi Branch',
              accountNumber: '998877665544',
              ifscCode: 'SBIN0001234',
              upiId: 'sbi@upi',
              openingBalance: 0.0,
              currentBalance: 5000.0,
              isPrimary: false,
              isActive: true,
            },
          ],
          pageNumber: 2,
          pageSize: 10,
          totalRecords: 3,
          totalPages: 2,
          hasPreviousPage: true,
          hasNextPage: false,
        },
        message: 'OK',
        statusCode: 200,
        errors: null,
      };

      const loadSpy = vi.spyOn(bankAccountService, 'getBankAccounts').mockReturnValue(of(nextPageData));
      component.totalPages.set(2);
      component.pageNumber.set(1);

      component.loadMoreAccounts();

      expect(loadSpy).toHaveBeenCalledWith({ pageNumber: 2, pageSize: 10, search: undefined });
      expect(component.accounts().length).toBe(3);
      expect(component.accounts()[2].accountName).toBe('SBI Branch');
    });
  });
});
