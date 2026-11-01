import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { environment } from '../../../environments/environment';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmployeeService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should post to get-all-employees with search and pagination payload', () => {
    const mockPayload = {
      Search: 'Samuel',
      PageNumber: 1,
      PageSize: 5,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        items: [
          {
            id: '5bd52b4a-1f1a-4aaf-bc98-6f82ae8e63d4',
            employeeId: 'EMP-0001',
            employeeName: 'Samuel John',
            email: 'samuel@gmail.com',
            phoneNumber: '9744510308',
            role: 'AdminEmployee',
            status: true,
            activeTask: 0,
            completedTask: 0,
            createdOn: '2026-11-01T15:58:45.8983542',
          },
        ],
        pageNumber: 1,
        pageSize: 5,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      message: 'Employees fetched successfully',
      statusCode: 200,
      errors: null,
    };

    service.getAllEmployees(mockPayload).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].employeeId).toBe('EMP-0001');
      expect(res.data.items[0].employeeName).toBe('Samuel John');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/User/admin/get-all-employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockPayload);
    req.flush(mockResponse);
  });

  it('should send put request to toggle-status endpoint', () => {
    const employeeId = '5bd52b4a-1f1a-4aaf-bc98-6f82ae8e63d4';
    service.toggleEmployeeStatus(employeeId).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/User/admin/toggle-status/${employeeId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ isSuccess: true, data: true, message: 'Status updated', statusCode: 200, errors: null });
  });
});

