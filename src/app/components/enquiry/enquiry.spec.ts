import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Enquiry } from './enquiry';
import { EnquiryItem } from '../../models/enquiry.model';
import { EnquiryService } from '../../services/enquiry/enquiry.service';

describe('Enquiry', () => {
  let component: Enquiry;
  let fixture: ComponentFixture<Enquiry>;
  let router: Router;

  const sampleEnquiry: EnquiryItem = {
    enquiryId: 'ENQ-2026-9901',
    customerName: 'Anand Sharma',
    phoneNumber: '9876543210',
    insuranceType: 'Vehicle Insurance',
    status: 'Quoted',
    createdAt: '2026-09-12T10:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Enquiry],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Enquiry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /quote with enquiryId and status=Quoted when navigateToQuotes is called', () => {
    let capturedCommands: any = null;
    let capturedExtras: any = null;

    router.navigate = ((commands: any, extras: any) => {
      capturedCommands = commands;
      capturedExtras = extras;
      return Promise.resolve(true);
    }) as any;

    const mockEvent = {
      stopPropagation: () => {},
    } as unknown as Event;

    component.navigateToQuotes(sampleEnquiry, mockEvent);

    expect(capturedCommands).toEqual(['/quote']);
    expect(capturedExtras).toEqual({
      queryParams: {
        enquiryId: 'ENQ-2026-9901',
        status: 'Quoted',
      },
    });
  });

  it('should stop event propagation when navigating to quotes to prevent opening drawer', () => {
    let stopped = false;
    const mockEvent = {
      stopPropagation: () => {
        stopped = true;
      },
    } as unknown as Event;

    router.navigate = (() => Promise.resolve(true)) as any;
    component.navigateToQuotes(sampleEnquiry, mockEvent);

    expect(stopped).toBe(true);
  });

  it('should stop event propagation and open WhatsApp web with prefilled message when openWhatsApp is called', () => {
    let stopped = false;
    const mockEvent = {
      stopPropagation: () => {
        stopped = true;
      },
    } as unknown as Event;

    let openedUrl = '';
    let openedTarget = '';
    const originalOpen = window.open;
    window.open = ((url: string, target: string) => {
      openedUrl = url;
      openedTarget = target;
      return null;
    }) as any;

    const testEnquiry: EnquiryItem = {
      ...sampleEnquiry,
      assignedStaff: 'Agent Vikram',
      assigedAgentNumber: '9876543210',
      createdAgentName: 'Creator Manoj',
      createdAgentNumber: '9123456780',
    };

    component.openWhatsApp(testEnquiry, mockEvent);

    expect(stopped).toBe(true);
    expect(openedTarget).toBe('_blank');
    expect(openedUrl).toContain('https://web.whatsapp.com/send?phone=919876543210');

    // Decode prefilled message text
    const urlParams = new URL(openedUrl).searchParams;
    const text = urlParams.get('text') || '';
    expect(text).toContain('Enquiry Regarding ENQ-2026-9901');
    expect(text).toContain('Agent Name - Agent Vikram');
    expect(text).toContain('Created Agent & Number - Creator Manoj, 9123456780');
    expect(text).toContain('Enquiry Status - Quoted');

    window.open = originalOpen;
  });

  it('should handle enquiry with 12-digit number with existing country code in openWhatsApp', () => {
    const mockEvent = { stopPropagation: () => {} } as unknown as Event;
    let openedUrl = '';
    const originalOpen = window.open;
    window.open = ((url: string) => {
      openedUrl = url;
      return null;
    }) as any;

    const testEnquiry: EnquiryItem = {
      ...sampleEnquiry,
      assigedAgentNumber: '+91 9988776655',
    };

    component.openWhatsApp(testEnquiry, mockEvent);
    expect(openedUrl).toContain('phone=919988776655');

    window.open = originalOpen;
  });

  it('should filter enquiries by staff agentId when setStaffFilter is called', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    let capturedParams: any = null;
    vi.spyOn(enquiryService, 'getAgentEnquiries').mockImplementation((params) => {
      capturedParams = params;
      return of({
        isSuccess: true,
        data: {
          enquiries: {
            items: [],
            pageNumber: 1,
            pageSize: 10,
            totalRecords: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
          metrics: {
            allEnquiries: 0,
            created: 0,
            submitted: 0,
            quoted: 0,
            agentReview: 0,
            paymentPending: 0,
            underwriterReview: 0,
            policyIssued: 0,
            cancelled: 0,
            pointsEarned: 0,
          },
        },
      } as any);
    });

    component.setStaffFilter('staff-agent-uuid-101');

    expect(component.selectedAgentId()).toBe('staff-agent-uuid-101');
    expect(component.pageNumber()).toBe(1);
    expect(capturedParams).toBeTruthy();
    expect(capturedParams.agentId).toBe('staff-agent-uuid-101');
  });

  it('should reset selectedAgentId to All when resetFilters is called', () => {
    component.selectedAgentId.set('staff-agent-uuid-101');
    expect(component.selectedAgentId()).toBe('staff-agent-uuid-101');

    component.resetFilters();

    expect(component.selectedAgentId()).toBe('All');
  });
});
