import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QrService } from './qr.service';
import { environment } from '../../../environments/environment';

describe('QrService', () => {
  let service: QrService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QrService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QrService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get QR masters with pagination and search params', () => {
    service.getQrMasters({ pageNumber: 1, pageSize: 10, search: 'CAR' }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/qr-master` &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10' &&
        r.params.get('Search') === 'CAR'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
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
        ],
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      message: 'QR Masters fetched successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should get QR mappings with pagination params', () => {
    service.getQrMappings({ pageNumber: 1, pageSize: 10 }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/qr-mappings` &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      isSuccess: true,
      data: {
        items: [
          {
            id: '69a9c02a',
            qrMasterId: 'ffe462d2',
            qrName: 'CAR',
            insuranceTypeId: 'c3f8d2ab',
            insuranceType: 'Vehicle Insurance',
            vehicleTypeId: 'dd1d65f6',
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
    });
  });

  it('should post createQrMaster with correct payload', () => {
    const payload = {
      upiId: 'Test@upi',
      upiName: 'NAME',
      bankAccountId: '96abcd02-c76f-4547-8887-d55386d05308',
    };

    service.createQrMaster(payload).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data).toBe('c7b2d111-a135-4776-bf17-0eaaab16e822');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/qr-master`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      isSuccess: true,
      data: 'c7b2d111-a135-4776-bf17-0eaaab16e822',
      message: 'QR Master created successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should get bank accounts with parameters', () => {
    service.getBankAccounts({ pageNumber: 1, pageSize: 20 }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].accountName).toBe('Car UPI');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/bank-accounts` &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '20'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
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
            openingBalance: 0.0,
            currentBalance: -14750.0,
            isPrimary: false,
            isActive: true,
          },
        ],
        pageNumber: 1,
        pageSize: 20,
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

  it('should post createQrMapping with correct payload', () => {
    const payload = {
      qrMasterId: '5f2b59f1-fcad-4f4c-b909-db1aa698b933',
      insuranceTypeId: 'c3f8d2ab-67f9-45e0-a0dc-6967910d9c02',
      vehicleTypeId: 'dd1d65f6-367b-4ee4-be5f-38b18159f968',
    };

    service.createQrMapping(payload).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/qr-mappings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      isSuccess: true,
      data: '69a9c02a-ff8c-4ab4-9e9a-41ac34127ef8',
      message: 'QR Mapping created successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should fetch insurance types', () => {
    service.getInsuranceTypes().subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.length).toBe(1);
      expect(res.data[0].name).toBe('Vehicle Insurance');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/insurance-types`);
    expect(req.request.method).toBe('GET');
    req.flush({
      isSuccess: true,
      data: [{ id: 'c3f8d2ab', name: 'Vehicle Insurance', isActive: true }],
      message: 'Insurance types fetched successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should fetch vehicle types', () => {
    service.getVehicleTypes().subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.length).toBe(1);
      expect(res.data[0].typeName).toBe('Private Car');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vehicle-types`);
    expect(req.request.method).toBe('GET');
    req.flush({
      isSuccess: true,
      data: [{ id: 'dd1d65f6', typeName: 'Private Car', isActive: true }],
      message: 'Vehicle types fetched successfully.',
      statusCode: 200,
      errors: null,
    });
  });
});

