import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { QrManagement } from './qr-management';
import { QrService } from '../../../../services/qr/qr.service';
import { ApiResponse } from '../../../../models/response.model';
import { BankAccountItem, PagedResult, QrMappingItem, UpiMasterItem } from '../../../../models/qr.model';

describe('QrManagement', () => {
  let component: QrManagement;
  let fixture: ComponentFixture<QrManagement>;
  let qrService: QrService;

  const mockUpiData: ApiResponse<PagedResult<UpiMasterItem>> = {
    isSuccess: true,
    data: {
      items: [
        {
          id: 'ffe467',
          bankAccountId: 'b66b78',
          bankAccount: 'Car UPI',
          upiId: '9744510308@upi',
          upiName: 'CAR',
          isActive: true,
        },
        {
          id: 'ffe468',
          bankAccountId: 'b66b79',
          bankAccount: 'Bike UPI',
          upiId: '9845012345@upi',
          upiName: 'BIKE',
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
    message: 'QR Masters fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  const mockMappingData: ApiResponse<PagedResult<QrMappingItem>> = {
    isSuccess: true,
    data: {
      items: [
        {
          id: '69a9c02a-ff8c-4ab4-9e9a-41ac34127ef8',
          qrMasterId: 'ffe462d2-908c-4a83-ad5f-2ae94960acf7',
          qrName: 'CAR',
          insuranceTypeId: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02',
          insuranceType: 'Vehicle Insurance',
          vehicleTypeId: 'dd1d65f6-367b-4ee4-be5f-38b18159f968',
          vehicleType: 'Private Car',
          bankName: 'ICICI',
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
    message: 'QR Mappings fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrManagement],
      providers: [QrService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    qrService = TestBed.inject(QrService);
    vi.spyOn(qrService, 'getQrMasters').mockReturnValue(of(mockUpiData));
    vi.spyOn(qrService, 'getQrMappings').mockReturnValue(of(mockMappingData));

    fixture = TestBed.createComponent(QrManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load UPI IDs on init and display them in Section 1', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.upiItems().length).toBe(2);
    expect(component.upiTotalRecords()).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    const upiSection = compiled.querySelector('#section-upi-ids');
    expect(upiSection).toBeTruthy();

    const upiRows = upiSection?.querySelectorAll('tbody tr');
    expect(upiRows?.length).toBe(2);
    expect(upiRows?.[0].textContent).toContain('9744510308@upi');
    expect(upiRows?.[0].textContent).toContain('CAR');
    expect(upiRows?.[0].textContent).toContain('Car UPI');
    expect(upiRows?.[0].textContent).toContain('Active');
  });

  it('should load QR Mappings on init and display them when QR Mapping tab is active', async () => {
    component.activeTab.set('mappings');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.qrMappingItems().length).toBe(1);
    expect(component.qrMappingTotalRecords()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    const mappingSection = compiled.querySelector('#section-qr-mappings');
    expect(mappingSection).toBeTruthy();

    const mappingRows = mappingSection?.querySelectorAll('tbody tr');
    expect(mappingRows?.length).toBe(1);
    expect(mappingRows?.[0].textContent).toContain('CAR');
    expect(mappingRows?.[0].textContent).toContain('ICICI');
    expect(mappingRows?.[0].textContent).toContain('Vehicle Insurance');
    expect(mappingRows?.[0].textContent).toContain('Private Car');
    expect(mappingRows?.[0].textContent).toContain('Active');
  });

  it('should filter UPI IDs by search query', () => {
    component.onUpiSearchChange('Bike');
    expect(component.filteredUpiItems().length).toBe(1);
    expect(component.filteredUpiItems()[0].upiName).toBe('BIKE');

    component.onUpiSearchChange('NonExistent');
    expect(component.filteredUpiItems().length).toBe(0);

    component.clearUpiSearch();
    expect(component.filteredUpiItems().length).toBe(2);
  });

  it('should filter QR Mappings by search query', () => {
    component.onQrMappingSearchChange('Private Car');
    expect(component.filteredQrMappingItems().length).toBe(1);

    component.onQrMappingSearchChange('Commercial');
    expect(component.filteredQrMappingItems().length).toBe(0);

    component.clearQrMappingSearch();
    expect(component.filteredQrMappingItems().length).toBe(1);
  });

  it('should toggle UPI ID status', () => {
    const toggleSpy = vi
      .spyOn(qrService, 'toggleQrMasterStatus')
      .mockReturnValue(of({ isSuccess: true, data: null, message: 'Updated', statusCode: 200, errors: null }));

    const item = component.upiItems()[0];
    expect(item.isActive).toBe(true);

    component.onToggleUpiStatus(item);

    expect(toggleSpy).toHaveBeenCalledWith('ffe467');
    expect(component.upiItems()[0].isActive).toBe(false);
  });

  it('should toggle QR Mapping status', () => {
    const toggleSpy = vi
      .spyOn(qrService, 'toggleQrMappingStatus')
      .mockReturnValue(of({ isSuccess: true, data: null, message: 'Updated', statusCode: 200, errors: null }));

    const item = component.qrMappingItems()[0];
    expect(item.isActive).toBe(true);

    component.onToggleQrMappingStatus(item);

    expect(toggleSpy).toHaveBeenCalledWith('69a9c02a-ff8c-4ab4-9e9a-41ac34127ef8');
    expect(component.qrMappingItems()[0].isActive).toBe(false);
  });

  it('should switch tabs between upi and mappings', async () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(component.activeTab()).toBe('upi');
    fixture.detectChanges();
    await fixture.whenStable();

    // In UPI tab: Section 1 visible, Section 2 hidden
    expect(compiled.querySelector('#section-upi-ids')).toBeTruthy();
    expect(compiled.querySelector('#section-qr-mappings')).toBeNull();

    // Switch to QR Mapping tab: Section 2 visible, Section 1 hidden
    component.activeTab.set('mappings');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('#section-upi-ids')).toBeNull();
    expect(compiled.querySelector('#section-qr-mappings')).toBeTruthy();

    // Switch back to UPI tab
    component.activeTab.set('upi');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('#section-upi-ids')).toBeTruthy();
    expect(compiled.querySelector('#section-qr-mappings')).toBeNull();
  });

  describe('Add UPI ID Modal', () => {
    const mockBankAccountsData: ApiResponse<PagedResult<BankAccountItem>> = {
      isSuccess: true,
      data: {
        items: [
          {
            id: 'b66b7202-8462-41c8-9aff-d07bf321d378',
            accountName: 'Car UPI',
            bankName: 'ICICI',
            branchName: 'Thodupuzha',
            accountHolderName: 'Anand',
            accountNumber: '587896587458',
            ifscCode: 'ICICI000331',
            upiId: '',
            openingBalance: 0,
            currentBalance: -14750,
            isPrimary: false,
            isActive: true,
          },
        ],
        pageNumber: 1,
        pageSize: 4,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      message: 'Bank accounts fetched successfully.',
      statusCode: 200,
      errors: null,
    };

    it('should open modal and load bank accounts', () => {
      const bankAccountsSpy = vi
        .spyOn(qrService, 'getBankAccounts')
        .mockReturnValue(of(mockBankAccountsData));

      expect(component.isAddUpiModalOpen()).toBe(false);
      component.openAddUpiModal();

      expect(component.isAddUpiModalOpen()).toBe(true);
      expect(bankAccountsSpy).toHaveBeenCalledWith({ pageSize: 50 });
      expect(component.bankAccounts().length).toBe(1);
      expect(component.bankAccounts()[0].accountName).toBe('Car UPI');
    });

    it('should close modal and reset form', () => {
      component.openAddUpiModal();
      component.addUpiForm.controls.upiId.setValue('test@upi');
      component.closeAddUpiModal();

      expect(component.isAddUpiModalOpen()).toBe(false);
      expect(component.addUpiForm.controls.upiId.value).toBe('');
    });

    it('should validate form and prevent submission when invalid', () => {
      const createSpy = vi.spyOn(qrService, 'createQrMaster');
      component.openAddUpiModal();

      expect(component.addUpiForm.valid).toBe(false);
      component.submitAddUpi();

      expect(createSpy).not.toHaveBeenCalled();
      expect(component.addUpiForm.controls.upiId.touched).toBe(true);
      expect(component.addUpiForm.controls.upiName.touched).toBe(true);
      expect(component.addUpiForm.controls.bankAccountId.touched).toBe(true);
    });

    it('should submit valid form, call API, close modal, and refresh list on success', () => {
      vi.spyOn(qrService, 'getBankAccounts').mockReturnValue(of(mockBankAccountsData));
      const createSpy = vi.spyOn(qrService, 'createQrMaster').mockReturnValue(
        of({
          isSuccess: true,
          data: 'c7b2d111-a135-4776-bf17-0eaaab16e822',
          message: 'QR Master created successfully.',
          statusCode: 200,
          errors: null,
        })
      );
      const refreshSpy = vi.spyOn(component, 'loadUpiMasters');

      component.openAddUpiModal();
      component.addUpiForm.setValue({
        upiId: 'test@upi',
        upiName: 'TEST',
        bankAccountId: 'b66b7202-8462-41c8-9aff-d07bf321d378',
      });

      expect(component.addUpiForm.valid).toBe(true);
      component.submitAddUpi();

      expect(createSpy).toHaveBeenCalledWith({
        upiId: 'test@upi',
        upiName: 'TEST',
        bankAccountId: 'b66b7202-8462-41c8-9aff-d07bf321d378',
      });
      expect(component.isAddUpiModalOpen()).toBe(false);
      expect(component.toastMessage()).toBe('QR Master created successfully.');
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle API error when creating UPI ID', () => {
      vi.spyOn(qrService, 'getBankAccounts').mockReturnValue(of(mockBankAccountsData));
      vi.spyOn(qrService, 'createQrMaster').mockReturnValue(
        throwError(() => ({
          error: { message: 'UPI ID already exists in master records.' },
        }))
      );

      component.openAddUpiModal();
      component.addUpiForm.setValue({
        upiId: 'duplicate@upi',
        upiName: 'DUPLICATE',
        bankAccountId: 'b66b7202-8462-41c8-9aff-d07bf321d378',
      });

      component.submitAddUpi();

      expect(component.isAddUpiModalOpen()).toBe(true);
      expect(component.addUpiError()).toBe('UPI ID already exists in master records.');
      expect(component.isSubmittingUpi()).toBe(false);
    });
  });

  describe('Add QR Mapping Modal', () => {
    const mockInsuranceTypesData = {
      isSuccess: true,
      data: [{ id: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02', name: 'Vehicle Insurance', isActive: true }],
      message: 'OK',
      statusCode: 200,
      errors: null,
    };
    const mockVehicleTypesData = {
      isSuccess: true,
      data: [{ id: 'dd1d65f6-367b-4ee4-be5f-38b18159f968', typeName: 'Private Car', isActive: true }],
      message: 'OK',
      statusCode: 200,
      errors: null,
    };

    it('should open modal and load mapping dropdowns', () => {
      vi.spyOn(qrService, 'getQrMasters').mockReturnValue(of(mockUpiData));
      vi.spyOn(qrService, 'getInsuranceTypes').mockReturnValue(of(mockInsuranceTypesData));
      vi.spyOn(qrService, 'getVehicleTypes').mockReturnValue(of(mockVehicleTypesData));

      expect(component.isAddQrMappingModalOpen()).toBe(false);
      component.openAddQrMappingModal();

      expect(component.isAddQrMappingModalOpen()).toBe(true);
      expect(component.availableQrMasters().length).toBe(2);
      expect(component.availableInsuranceTypes().length).toBe(1);
      expect(component.availableVehicleTypes().length).toBe(1);
    });

    it('should close modal and reset form', () => {
      component.openAddQrMappingModal();
      component.addMappingForm.controls.qrMasterId.setValue('some-id');
      component.closeAddQrMappingModal();

      expect(component.isAddQrMappingModalOpen()).toBe(false);
      expect(component.addMappingForm.controls.qrMasterId.value).toBe('');
    });

    it('should prevent submission when form is invalid', () => {
      const createSpy = vi.spyOn(qrService, 'createQrMapping');
      component.openAddQrMappingModal();

      expect(component.addMappingForm.valid).toBe(false);
      component.submitAddMapping();

      expect(createSpy).not.toHaveBeenCalled();
      expect(component.addMappingForm.controls.qrMasterId.touched).toBe(true);
      expect(component.addMappingForm.controls.insuranceTypeId.touched).toBe(true);
      expect(component.addMappingForm.controls.vehicleTypeId.touched).toBe(true);
    });

    it('should submit valid form with exact payload, call API, close modal, and refresh list on success', () => {
      vi.spyOn(qrService, 'getQrMasters').mockReturnValue(of(mockUpiData));
      vi.spyOn(qrService, 'getInsuranceTypes').mockReturnValue(of(mockInsuranceTypesData));
      vi.spyOn(qrService, 'getVehicleTypes').mockReturnValue(of(mockVehicleTypesData));

      const createSpy = vi.spyOn(qrService, 'createQrMapping').mockReturnValue(
        of({
          isSuccess: true,
          data: '69a9c02a-ff8c-4ab4-9e9a-41ac34127ef8',
          message: 'QR Mapping created successfully.',
          statusCode: 200,
          errors: null,
        })
      );
      const refreshSpy = vi.spyOn(component, 'loadQrMappings');

      component.openAddQrMappingModal();
      component.addMappingForm.setValue({
        qrMasterId: '5f2b59f1-fcad-4f4c-b909-db1aa698b933',
        insuranceTypeId: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02',
        vehicleTypeId: 'dd1d65f6-367b-4ee4-be5f-38b18159f968',
      });

      expect(component.addMappingForm.valid).toBe(true);
      component.submitAddMapping();

      expect(createSpy).toHaveBeenCalledWith({
        qrMasterId: '5f2b59f1-fcad-4f4c-b909-db1aa698b933',
        insuranceTypeId: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02',
        vehicleTypeId: 'dd1d65f6-367b-4ee4-be5f-38b18159f968',
      });
      expect(component.isAddQrMappingModalOpen()).toBe(false);
      expect(component.toastMessage()).toBe('QR Mapping created successfully.');
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle API error when creating QR Mapping', () => {
      vi.spyOn(qrService, 'createQrMapping').mockReturnValue(
        throwError(() => ({
          error: { message: 'Mapping combination already exists.' },
        }))
      );

      component.openAddQrMappingModal();
      component.addMappingForm.setValue({
        qrMasterId: '5f2b59f1-fcad-4f4c-b909-db1aa698b933',
        insuranceTypeId: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02',
        vehicleTypeId: 'dd1d65f6-367b-4ee4-be5f-38b18159f968',
      });

      component.submitAddMapping();

      expect(component.isAddQrMappingModalOpen()).toBe(true);
      expect(component.addMappingError()).toBe('Mapping combination already exists.');
      expect(component.isSubmittingMapping()).toBe(false);
    });
  });
});
