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
});

