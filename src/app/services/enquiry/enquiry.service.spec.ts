import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnquiryService } from './enquiry.service';
import { environment } from '../../../environments/environment';

describe('EnquiryService', () => {
  let service: EnquiryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EnquiryService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EnquiryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getAdminCommonQueue with query string parameters', () => {
    const mockParams = {
      search: 'Rahul',
      insuranceTypeId: 'ins-uuid-1',
      vehicleTypeId: 'veh-uuid-1',
      fromDate: '2026-11-01',
      toDate: '2026-11-02',
      dateFilter: 1,
      sortDescending: true,
      pageNumber: 1,
      pageSize: 4,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        pageNumber: 1,
        pageSize: 4,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        items: [
          {
            id: 'e1-uuid-1111',
            enquiryId: 'ENQ-55184',
            customerName: 'Rahul Verma',
            customerNumber: '9876543210',
            vehicleNumber: 'KL-07-CD-1234',
            vehicleType: 'Private Car',
            policyType: 'Comprehensive',
            insuranceType: 'Vehicle Insurance',
            status: 'Submitted',
            createdBy: 'Arun Kumar',
            createdByPhone: '9846645576',
            createdByRole: 'Agent',
            agencyName: 'Altrsync Agency',
            agencyNumber: 'AG-101',
            submittedOn: '2026-11-01T15:58:45.898Z',
            priority: 2,
          },
        ],
      },
      message: 'Queue items retrieved successfully',
      statusCode: 200,
      errors: null,
    };

    service.getAdminCommonQueue(mockParams).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].enquiryId).toBe('ENQ-55184');
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/common-queue` &&
        r.params.get('Search') === 'Rahul' &&
        r.params.get('InsuranceTypeId') === 'ins-uuid-1' &&
        r.params.get('VehicleTypeId') === 'veh-uuid-1' &&
        r.params.get('FromDate') === '2026-11-01' &&
        r.params.get('ToDate') === '2026-11-02' &&
        r.params.get('DateFilter') === '1' &&
        r.params.get('SortDescending') === 'true' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '4'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getAdminAllEnquiries with search, status, and account parameters', () => {
    const mockParams = {
      search: 'anand',
      status: 2,
      insuranceTypeId: 'ins-uuid-1',
      vehicleTypeId: 'veh-uuid-1',
      accountId: 'acc-uuid-1',
      fromDate: '2026-11-01',
      toDate: '2026-11-03',
      dateFilter: 1,
      sortDescending: true,
      pageNumber: 1,
      pageSize: 4,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        pageNumber: 1,
        pageSize: 4,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        items: [
          {
            id: 'enq-uuid-999',
            enquiryId: 'ENQ-999',
            customerName: 'Anand Asokan',
            customerNumber: '9744510308',
            vehicleNumber: 'KL-07-CD-9999',
            vehicleType: 'Private Car',
            insuranceType: 'Vehicle Insurance',
            policyType: 'Comprehensive',
            createdBy: 'Arun Kumar',
            agencyName: 'Altrsync Agency',
            submittedOn: '2026-11-02T10:00:00Z',
            status: 'Submitted',
            assignedEmployee: 'Samuel John',
            quoteCount: 3,
          },
        ],
      },
      message: 'Enquiries fetched successfully.',
      statusCode: 200,
      errors: null,
    };

    service.getAdminAllEnquiries(mockParams).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].enquiryId).toBe('ENQ-999');
      expect(res.data.items[0].quoteCount).toBe(3);
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/all-enquiries` &&
        r.params.get('Search') === 'anand' &&
        r.params.get('Status') === '2' &&
        r.params.get('InsuranceTypeId') === 'ins-uuid-1' &&
        r.params.get('VehicleTypeId') === 'veh-uuid-1' &&
        r.params.get('AccountId') === 'acc-uuid-1' &&
        r.params.get('FromDate') === '2026-11-01' &&
        r.params.get('ToDate') === '2026-11-03' &&
        r.params.get('DateFilter') === '1' &&
        r.params.get('SortDescending') === 'true' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '4'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getAdminMyTasks with query string parameters', () => {
    const mockParams = {
      search: 'anand',
      insuranceTypeId: 'ins-uuid-1',
      vehicleTypeId: 'veh-uuid-1',
      policyType: 1,
      enquiryStatus: 2,
      fromDate: '2026-11-01',
      toDate: '2026-11-03',
      accountId: 'acc-uuid-1',
      sortBy: 1,
      dateFilter: 1,
      sortDirection: 2,
      pageNumber: 1,
      pageSize: 10,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        items: [
          {
            id: 'my-task-1',
            enquiryId: 'ENQ-MYTASK-1',
            customerName: 'Anand Asokan',
            customerNumber: '9744510308',
            vehicleNumber: 'KL-07-CD-9999',
            vehicleType: 'Private Car',
            policyType: 'Comprehensive',
            insuranceType: 'Vehicle Insurance',
            enquiryStatus: 'Submitted',
            createdBy: 'Arun Kumar',
            createdByPhone: '9846645576',
            createdByRole: 'Agent',
            agencyName: 'Altrsync Agency',
            submittedOn: '2026-11-02T10:00:00Z',
            priority: 2,
          },
        ],
      },
      message: 'Enquiries fetched successfully',
      statusCode: 200,
      errors: null,
    };

    service.getAdminMyTasks(mockParams).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].enquiryId).toBe('ENQ-MYTASK-1');
      expect(res.data.items[0].priority).toBe(2);
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/mytask` &&
        r.params.get('Search') === 'anand' &&
        r.params.get('InsuranceTypeId') === 'ins-uuid-1' &&
        r.params.get('VehicleTypeId') === 'veh-uuid-1' &&
        r.params.get('PolicyType') === '1' &&
        r.params.get('EnquiryStatus') === '2' &&
        r.params.get('AccountId') === 'acc-uuid-1' &&
        r.params.get('FromDate') === '2026-11-01' &&
        r.params.get('ToDate') === '2026-11-03' &&
        r.params.get('SortBy') === '1' &&
        r.params.get('DateFilter') === '1' &&
        r.params.get('SortDirection') === '2' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getAdminMyQuoteQueue with Type=0 (Quote) and query params', () => {
    const mockParams = {
      type: 0,
      search: 'anand',
      insuranceTypeId: 'ins-uuid-1',
      vehicleTypeId: 'veh-uuid-1',
      accountId: 'acc-uuid-1',
      fromDate: '2026-11-01',
      toDate: '2026-11-03',
      sortDescending: true,
      dateFilter: 1,
      pageNumber: 1,
      pageSize: 10,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        items: [
          {
            id: 'quote-item-1',
            enquiryId: 'ENQ-QUOTE-1',
            customerName: 'Anand Asokan',
            customerNumber: '9744510308',
            vehicleNumber: 'KL-07-CD-1234',
            vehicleType: 'Private Car',
            insuranceType: 'Vehicle Insurance',
            policyType: 'Comprehensive',
            createdBy: 'Arun Agent',
            createdByPhone: '9846645576',
            createdByRole: 'Agent',
            agencyName: 'Altrsync Agency',
            submittedOn: '2026-11-02T10:00:00Z',
            priority: 2,
            status: 'Submitted',
            adminAssisted: false,
            quoteCount: 0,
            currentStep: 'Quoting',
            assignedEmployee: 'Samuel John',
            assignedEmployeeRole: 'AdminEmployee',
          },
        ],
      },
      message: 'Quote queue fetched successfully',
      statusCode: 200,
      errors: null,
    };

    service.getAdminMyQuoteQueue(mockParams).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].enquiryId).toBe('ENQ-QUOTE-1');
      expect(res.data.items[0].quoteCount).toBe(0);
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/myquotequeue` &&
        r.params.get('Type') === '0' &&
        r.params.get('Search') === 'anand' &&
        r.params.get('InsuranceTypeId') === 'ins-uuid-1' &&
        r.params.get('VehicleTypeId') === 'veh-uuid-1' &&
        r.params.get('AccountId') === 'acc-uuid-1' &&
        r.params.get('FromDate') === '2026-11-01' &&
        r.params.get('ToDate') === '2026-11-03' &&
        r.params.get('SortDescending') === 'true' &&
        r.params.get('DateFilter') === '1' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getAdminMyQuoteQueue with Type=1 (Quoted)', () => {
    service.getAdminMyQuoteQueue({ type: 1, pageNumber: 1, pageSize: 10 }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/myquotequeue` &&
        r.params.get('Type') === '1' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush({ isSuccess: true, data: { items: [], totalRecords: 0 } });
  });

  it('should call getAdminMyPolicyQueue with all parameters for Type=0 (Policy)', () => {
    const mockParams = {
      type: 0,
      search: 'kavitha',
      status: 6,
      insuranceTypeId: 'ins-uuid-1',
      vehicleTypeId: 'veh-uuid-1',
      accountId: 'acc-uuid-1',
      fromDate: '2026-11-01',
      toDate: '2026-11-03',
      sortDescending: true,
      dateFilter: 1,
      pageNumber: 1,
      pageSize: 10,
    };

    const mockResponse = {
      isSuccess: true,
      data: {
        pageNumber: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        items: [
          {
            id: 'pol-uuid-1',
            enquiryId: 'ENQ-POL-1',
            customerName: 'Kavitha Nair',
            customerNumber: '9846645511',
            vehicleNumber: 'KL-07-CD-3333',
            vehicleType: 'Private Car',
            insuranceType: 'Vehicle Insurance',
            policyType: 'Comprehensive',
            createdBy: 'Arun Kumar',
            createdByPhone: '9846645576',
            createdByRole: 'Agent',
            agencyName: 'Altrsync Agency',
            submittedOn: '2026-11-02T10:00:00Z',
            priority: 2,
            status: 'PolicyInProgress',
            adminAssisted: true,
            quoteCount: 2,
            currentStep: 'PolicyIssuance',
            assignedEmployee: 'Samuel John',
            assignedEmployeeRole: 'AdminEmployee',
          },
        ],
      },
      message: 'Policy queue fetched successfully',
      statusCode: 200,
      errors: null,
    };

    service.getAdminMyPolicyQueue(mockParams).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].enquiryId).toBe('ENQ-POL-1');
      expect(res.data.items[0].status).toBe('PolicyInProgress');
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/mypolicyqueue` &&
        r.params.get('Type') === '0' &&
        r.params.get('Search') === 'kavitha' &&
        r.params.get('Status') === '6' &&
        r.params.get('InsuranceTypeId') === 'ins-uuid-1' &&
        r.params.get('VehicleTypeId') === 'veh-uuid-1' &&
        r.params.get('AccountId') === 'acc-uuid-1' &&
        r.params.get('FromDate') === '2026-11-01' &&
        r.params.get('ToDate') === '2026-11-03' &&
        r.params.get('SortDescending') === 'true' &&
        r.params.get('DateFilter') === '1' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getAdminMyPolicyQueue with Type=1 (Policy Issued)', () => {
    service.getAdminMyPolicyQueue({ type: 1, pageNumber: 1, pageSize: 10 }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne((r) => {
      return (
        r.url === `${environment.apiUrl}/Enquiry/admin/mypolicyqueue` &&
        r.params.get('Type') === '1' &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '10'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush({ isSuccess: true, data: { items: [], totalRecords: 0 } });
  });
});

