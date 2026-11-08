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

  it('should post to get-all-employees with query string filters', () => {
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

    const req = httpMock.expectOne((request) => request.url === `${environment.apiUrl}/User/admin/get-all-employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.params.get('Search')).toBe('Samuel');
    expect(req.request.params.get('PageNumber')).toBe('1');
    expect(req.request.params.get('PageSize')).toBe('5');
    req.flush(mockResponse);
  });

  it('should send post request to the employee status endpoint', () => {
    const employeeId = '5bd52b4a-1f1a-4aaf-bc98-6f82ae8e63d4';
    service.toggleEmployeeStatus(employeeId).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/User/admin/toggle-employee-status/${employeeId}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ isSuccess: true, data: true, message: 'Status updated', statusCode: 200, errors: null });
  });

  it('should create an internal user', () => {
    const payload = {
      UserName: 'samuel', FullName: 'Samuel John', Email: 'samuel@example.com', PhoneNumber: '1234567890',
      Password: 'password123', UserType: 'AdminEmployee', WorkAllocations: [], ModulePermissions: ['Dashboard'],
    };
    service.createInternalUser(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/User/admin/create-internal-user`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ isSuccess: true, data: true, message: 'Created', statusCode: 200, errors: null });
  });

  it('should fetch and update employee rights', () => {
    const employeeId = 'employee-1';
    service.getEmployeeRights(employeeId).subscribe();
    const getRequest = httpMock.expectOne(`${environment.apiUrl}/User/admin/employee-rights/${employeeId}`);
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({ isSuccess: true, data: { userId: employeeId, fullName: 'Sam', userType: 'AdminEmployee', workAllocations: [], modulePermissions: [] }, message: '', statusCode: 200, errors: null });

    const payload = { UserId: employeeId, WorkAllocations: [], ModulePermissions: ['Dashboard'] };
    service.updateEmployeeRights(payload).subscribe();
    const updateRequest = httpMock.expectOne(`${environment.apiUrl}/User/admin/update-employee-rights`);
    expect(updateRequest.request.method).toBe('POST');
    expect(updateRequest.request.body).toEqual(payload);
    updateRequest.flush({ isSuccess: true, data: true, message: 'Updated', statusCode: 200, errors: null });
  });

  it('should update employee details', () => {
    const payload = { UserId: 'employee-1', FullName: 'Samuel John', Email: 'samuel@example.com', PhoneNumber: '1234567890' };
    service.updateEmployee(payload).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/User/admin/update-employee`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ isSuccess: true, data: true, message: 'Updated', statusCode: 200, errors: null });
  });
});

