import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AdminAgents } from './admin-agents';
import { AccountService } from '../../../services/account/account.service';
import { ApiResponse } from '../../../models/response.model';
import { AgentsResponseData } from '../../../models/account.model';

describe('AdminAgents', () => {
  let component: AdminAgents;
  let fixture: ComponentFixture<AdminAgents>;
  let accountService: AccountService;

  const mockAgentsData: ApiResponse<AgentsResponseData> = {
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
            agencyName: 'Altrsync Agency',
            email: 'arun@gmail.com',
            phoneNumber: '9846645576',
            address: null,
            pincode: '685588',
            isApproved: true,
            status: 'Active',
            joinedOn: '2026-06-07T07:11:15.7099474',
          },
          {
            accountId: '30168d46-8432-434a-8583-46e704ad2e07',
            agentId: 'rahul-202',
            agentName: 'Rahul Sasi',
            agencyName: 'RS Associates',
            email: 'rahul@gmail.com',
            phoneNumber: '9744510308',
            address: 'Ernakulam',
            pincode: '682001',
            isApproved: false,
            status: 'Pending',
            joinedOn: '2026-07-10T10:00:00.0000000',
          },
        ],
        pageNumber: 1,
        pageSize: 5,
        totalRecords: 2,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
    message: 'Agents fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgents],
      providers: [AccountService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    accountService = TestBed.inject(AccountService);
    vi.spyOn(accountService, 'getAgents').mockReturnValue(of(mockAgentsData));

    fixture = TestBed.createComponent(AdminAgents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load agents and summary metrics on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.agents().length).toBe(2);
    expect(component.summary().activeAgents).toBe(10);
    expect(component.summary().pendingApprovals).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    const miniCards = compiled.querySelectorAll('.carbon-mini-card');
    expect(miniCards.length).toBe(2);
    expect(miniCards[0].textContent).toContain('10');
    expect(miniCards[0].textContent).toContain('Active Agents');
    expect(miniCards[1].textContent).toContain('1');
    expect(miniCards[1].textContent).toContain('Pending Approvals');
  });

  it('should render agent table rows with details, contact and status', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('altrsync-101');
    expect(firstRowText).toContain('altrsync');
    expect(firstRowText).toContain('Altrsync Agency');
    expect(firstRowText).toContain('arun@gmail.com');
    expect(firstRowText).toContain('9846645576');
    expect(firstRowText).toContain('Active');
  });

  it('should filter agents by status filter', () => {
    component.onStatusFilterChange('Pending');
    expect(component.statusFilter()).toBe('Pending');
    expect(component.filteredAgents().length).toBe(1);
    expect(component.filteredAgents()[0].status).toBe('Pending');

    component.onStatusFilterChange('All');
    expect(component.filteredAgents().length).toBe(2);
  });

  it('should filter agents by search query', () => {
    component.onSearchChange('Rahul');
    expect(component.filteredAgents().length).toBe(1);
    expect(component.filteredAgents()[0].agentName).toBe('Rahul Sasi');

    component.onSearchChange('NonExistent');
    expect(component.filteredAgents().length).toBe(0);

    component.clearSearch();
    expect(component.filteredAgents().length).toBe(2);
  });

  it('should toggle agent status and update summary count', () => {
    const toggleSpy = vi
      .spyOn(accountService, 'toggleAgentStatus')
      .mockReturnValue(of({ isSuccess: true, data: null, message: 'Status updated', statusCode: 200, errors: null }));

    const agent = component.agents()[0]; // Active agent
    expect(agent.status).toBe('Active');
    expect(component.summary().activeAgents).toBe(10);

    component.onToggleStatus(agent);

    expect(toggleSpy).toHaveBeenCalledWith('20168d46-8432-434a-8583-46e704ad2e06');
    expect(component.agents()[0].status).toBe('Inactive');
    expect(component.summary().activeAgents).toBe(9);
  });

  it('should handle refresh action', () => {
    const loadSpy = vi.spyOn(component, 'loadAgents');
    component.refreshAgents();
    expect(loadSpy).toHaveBeenCalled();
    expect(component.toastMessage()).toBe('Agents refreshed.');
  });

  it('should handle pagination changes', () => {
    const loadSpy = vi.spyOn(component, 'loadAgents');
    component.onPageSizeChange(10);
    expect(component.pageSize()).toBe(10);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should format dates properly', () => {
    const formatted = component.formatDate('2026-06-07T07:11:15.7099474');
    expect(formatted).toContain('2026');
    expect(component.formatDate(undefined)).toBe('-');
  });

  it('should show Edit icon for Active agents and Approve button for Pending agents', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    // Row 0 is Active -> should have .edit-action-btn and no .carbon-btn-approve
    expect(rows[0].querySelector('.edit-action-btn')).toBeTruthy();
    expect(rows[0].querySelector('.carbon-btn-approve')).toBeNull();

    // Row 1 is Pending -> should have .carbon-btn-approve and no .edit-action-btn
    const approveBtn = rows[1].querySelector('.carbon-btn-approve');
    expect(approveBtn).toBeTruthy();
    expect(approveBtn?.textContent).toContain('Approve');
    expect(rows[1].querySelector('.edit-action-btn')).toBeNull();
  });

  it('should call approveAgent when Approve button is clicked, update status & metrics, and refresh list', () => {
    const approveSpy = vi.spyOn(accountService, 'approveAgent').mockReturnValue(
      of({
        isSuccess: true,
        data: true,
        message: 'Agent approved successfully',
        statusCode: 200,
        errors: null,
      })
    );
    const loadSpy = vi.spyOn(component, 'loadAgents').mockImplementation(() => {});

    const pendingAgent = component.agents()[1]; // status: 'Pending'
    expect(pendingAgent.status).toBe('Pending');
    expect(component.summary().pendingApprovals).toBe(1);
    expect(component.summary().activeAgents).toBe(10);

    component.onApproveAgent(pendingAgent);

    expect(approveSpy).toHaveBeenCalledWith('30168d46-8432-434a-8583-46e704ad2e07');
    expect(component.agents()[1].status).toBe('Active');
    expect(component.summary().pendingApprovals).toBe(0);
    expect(component.summary().activeAgents).toBe(11);
    expect(component.toastMessage()).toBe('Agent approved successfully');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should handle approveAgent error', () => {
    vi.spyOn(accountService, 'approveAgent').mockReturnValue(
      throwError(() => ({
        error: { message: 'Agent account already verified or invalid.' },
      }))
    );

    const pendingAgent = component.agents()[1];
    component.onApproveAgent(pendingAgent);

    expect(component.toastMessage()).toBe('Agent account already verified or invalid.');
    expect(component.approvingAccountId()).toBeNull();
  });
});
