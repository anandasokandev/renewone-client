import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminViewAgents } from './admin-view-agents';
import { AccountService } from '../../../services/account/account.service';
import { Auth } from '../../../services/auth/auth';

describe('AdminViewAgents', () => {
  let component: AdminViewAgents;
  let fixture: ComponentFixture<AdminViewAgents>;
  let accountService: AccountService;
  let authService: Auth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminViewAgents],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'accountId' ? 'test-account-123' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    accountService = TestBed.inject(AccountService);
    authService = TestBed.inject(Auth);
    authService.currentUser.set({
      userId: 'admin-user-id',
      fullName: 'Admin User',
      userType: 'SuperAdmin',
      accountId: 'admin-1',
      token: 'mock-token',
    });
    vi.spyOn(accountService, 'getAgentDetails').mockReturnValue(
      of({
        isSuccess: true,
        data: {
          accountId: 'test-account-123',
          agentCode: 'AG-101',
          agentName: 'John Doe',
          agencyName: 'Apex Agency',
          phoneNumber: '9876543210',
          email: 'john@apex.com',
          joinedDate: '2026-01-15T00:00:00Z',
          address: 'Kochi, Kerala',
          pincode: '682001',
          isActive: true,
          agentClassName: 'Class A',
        },
        message: 'Success',
        statusCode: 200,
        errors: null,
      })
    );
    vi.spyOn(accountService, 'getAgentDashboardOverview').mockReturnValue(
      of({
        isSuccess: true,
        data: {
          businessSummary: {
            totalEnquiries: 45,
            growthPercentage: 12.5,
            policiesCompleted: 20,
            quoteInProgress: 10,
            policyInProgress: 5,
          },
          revenueSummary: {
            monthlySales: 150000,
            lifetimeSales: 1200000,
            monthlyProfit: 15000,
            lifetimeProfit: 120000,
            companyPayable: 135000,
            commissionEarned: 15000,
          },
          recentEnquiries: [
            {
              id: 'enq-1',
              customerName: 'Alice Smith',
              insuranceType: 'Motor Comprehensive',
              status: 'Quote Sent',
              premium: 12500,
            },
          ],
          recentPolicies: [],
        },
        message: 'Success',
        statusCode: 200,
        errors: null,
      })
    );

    fixture = TestBed.createComponent(AdminViewAgents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and load agent profile details', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.agent()?.agentCode).toBe('AG-101');
    expect(component.agent()?.agencyName).toBe('Apex Agency');
  });

  it('should render profile header, contact cards and tabs nav', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.profile-name')?.textContent).toContain('Apex Agency');
    expect(compiled.querySelector('.agent-code-badge')?.textContent).toContain('AG-101');
    expect(compiled.querySelector('.status-badge')?.textContent).toContain('Active');

    const contactCards = compiled.querySelectorAll('.contact-card');
    expect(contactCards.length).toBe(4);
    expect(contactCards[0].textContent).toContain('john@apex.com');
    expect(contactCards[1].textContent).toContain('9876543210');

    const tabs = compiled.querySelectorAll('.tab-btn');
    expect(tabs.length).toBe(4);
    expect(tabs[0].textContent).toContain('Overview');
  });

  it('should switch tabs when clicked', () => {
    expect(component.tab()).toBe('overview');
    component.selectTab('staff');
    expect(component.tab()).toBe('staff');
    component.selectTab('finance');
    expect(component.tab()).toBe('finance');
    component.selectTab('activity');
    expect(component.tab()).toBe('activity');
  });

  it('should open edit details popup modal and close on cancel', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-backdrop')).toBeNull();

    // Click "Edit details" button
    const editBtn = compiled.querySelector<HTMLButtonElement>('.profile-actions .btn-edit');
    expect(editBtn).toBeTruthy();
    editBtn?.click();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.editingDetails()).toBe(true);
    const modalBackdrop = compiled.querySelector('.modal-backdrop');
    expect(modalBackdrop).toBeTruthy();
    expect(compiled.querySelector('.modal-dialog')).toBeTruthy();
    expect(compiled.querySelector('.modal-header h2')?.textContent).toContain('Edit Agent Details');

    // Click "Cancel" button in modal
    const cancelBtn = compiled.querySelector<HTMLButtonElement>('.modal-footer .btn-cancel-action');
    expect(cancelBtn).toBeTruthy();
    cancelBtn?.click();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.editingDetails()).toBe(false);
    expect(compiled.querySelector('.modal-backdrop')).toBeNull();
  });
});
