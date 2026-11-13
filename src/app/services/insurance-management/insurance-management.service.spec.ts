import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsuranceManagementService } from './insurance-management.service';
import { environment } from '../../../environments/environment';

describe('InsuranceManagementService', () => {
  let service: InsuranceManagementService;
  let httpTesting: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InsuranceManagementService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(InsuranceManagementService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should fetch insurance types via GET /insurance-types', () => {
    const mockData = { isSuccess: true, data: [{ id: '1', name: 'Motor', isActive: true }], message: 'OK', statusCode: 200, errors: null };

    service.getInsuranceTypes().subscribe(res => {
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0].name).toBe('Motor');
    });

    const req = httpTesting.expectOne(`${baseUrl}/insurance-types`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should create insurance type via POST /insurance-types', () => {
    const payload = { name: 'Health', displayOrder: 2 };
    const mockRes = { isSuccess: true, data: { id: '2', name: 'Health', displayOrder: 2, isActive: true }, message: 'Created', statusCode: 201, errors: null };

    service.createInsuranceType(payload).subscribe(res => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/insurance-types`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRes);
  });

  it('should fetch vehicle types via GET /vehicle-types', () => {
    const mockData = { isSuccess: true, data: [{ id: 'v1', typeName: 'Car', isActive: true }], message: 'OK', statusCode: 200, errors: null };

    service.getVehicleTypes().subscribe(res => {
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0].typeName).toBe('Car');
    });

    const req = httpTesting.expectOne(`${baseUrl}/vehicle-types`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should update vehicle type via PUT /vehicle-types/:id', () => {
    const payload = { typeName: 'Private Car', description: 'Four Wheeler' };
    const mockRes = { isSuccess: true, data: { id: 'v1', typeName: 'Private Car', isActive: true }, message: 'Updated', statusCode: 200, errors: null };

    service.updateVehicleType('v1', payload).subscribe(res => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpTesting.expectOne(`${baseUrl}/vehicle-types/v1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(mockRes);
  });
});

