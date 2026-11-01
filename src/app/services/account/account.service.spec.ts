import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccountService } from './account.service';
import { environment } from '../../../environments/environment';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch agents with query parameters', () => {
    service.getAgents({ pageNumber: 1, pageSize: 5, userType: 'Agent', search: 'altrsync' }).subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data.summary.activeAgents).toBe(10);
      expect(res.data.agents.items.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/Account/agents` &&
        r.params.get('PageNumber') === '1' &&
        r.params.get('PageSize') === '5' &&
        r.params.get('UserType') === 'Agent' &&
        r.params.get('Search') === 'altrsync'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      isSuccess: true,
      data: {
        summary: {
          activeAgents: 10,
          pendingApprovals: 1,
        },
        agents: {
          items: [
            {
              accountId: '20168d46-8432-434a-8583-46e704ad2e06',
              agentId: 'altrsync-101',
              agentName: 'altrsync',
              agencyName: 'altrsync',
              email: 'arun@gmail.com',
              phoneNumber: '9846645576',
              address: null,
              pincode: '685588',
              isApproved: null,
              status: 'Active',
              joinedOn: '2026-06-07T07:11:15.7099474',
            },
          ],
          pageNumber: 1,
          pageSize: 5,
          totalRecords: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
      message: 'Agents fetched successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should toggle agent status', () => {
    service.toggleAgentStatus('20168d46').subscribe((res) => {
      expect(res.isSuccess).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/Account/20168d46/toggle-status`);
    expect(req.request.method).toBe('PUT');
    req.flush({
      isSuccess: true,
      data: null,
      message: 'Status updated successfully.',
      statusCode: 200,
      errors: null,
    });
  });

  it('should post approveAgent with accountId', () => {
    service.approveAgent('30168d46').subscribe((res) => {
      expect(res.isSuccess).toBe(true);
      expect(res.data).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/Account/approve-agent/30168d46`);
    expect(req.request.method).toBe('POST');
    req.flush({
      isSuccess: true,
      data: true,
      message: 'Agent approved successfully',
      statusCode: 200,
      errors: null,
    });
  });
});

