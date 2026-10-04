import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnquiryDetails } from './enquiry-details';
import { EnquiryItem } from '../../models/enquiry.model';

describe('EnquiryDetails', () => {
  let component: EnquiryDetails;
  let fixture: ComponentFixture<EnquiryDetails>;

  const mockEnquiry: EnquiryItem = {
    enquiryId: 'ENQ-0001',
    enquiryNumber: 'ENQ-0001',
    customerName: 'Anand Asokan',
    phoneNumber: '9744510308',
    customerEmail: 'anand@example.com',
    insuranceType: 'Vehicle Insurance',
    vehicleType: 'Private Car',
    status: 'QuoteInProgress',
    createdAt: '2026-09-14T10:00:00Z',
    assignedStaff: 'Agent Rahul',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnquiryDetails],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(EnquiryDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute activeStatus from enquiry input', () => {
    component.enquiry = mockEnquiry;
    expect(component.activeStatus()).toBe('QuoteInProgress');
    expect(component.getStatusLabel('QuoteInProgress')).toBe('Quote In Progress');
    expect(component.getProgressPercentage('QuoteInProgress')).toBeGreaterThan(0);
    expect(component.isCancelled('QuoteInProgress')).toBe(false);
  });

  it('should handle cancelled status lifecycle correctly', () => {
    component.status = 'Cancelled';
    expect(component.isCancelled('Cancelled')).toBe(true);
    expect(component.getProgressPercentage('Cancelled')).toBe(0);
  });

  it('should emit close event when closeModal is called', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    component.closeModal();
    expect(closed).toBe(true);
  });

  it('should identify whether an assigned agent is present or null/unassigned', () => {
    component.enquiry = mockEnquiry;
    expect(component.hasAssignedAgent()).toBe(true);

    const unassignedEnquiry: EnquiryItem = {
      ...mockEnquiry,
      assignedStaff: 'Unassigned',
      assignedAgentName: undefined,
      assignedAgentId: undefined,
      assigedAgentNumber: undefined,
    };
    component.enquiry = unassignedEnquiry;
    expect(component.hasAssignedAgent()).toBe(false);

    component.enquiry = null;
    expect(component.hasAssignedAgent()).toBe(false);
  });


  it('should render WhatsApp button on right side and disable it when assigned agent is null/unassigned', () => {
    const localFixture = TestBed.createComponent(EnquiryDetails);
    const localComp = localFixture.componentInstance;
    localComp.enquiry = {
      ...mockEnquiry,
      assignedStaff: 'Unassigned',
      assignedAgentName: '',
      assignedAgentId: '',
      assigedAgentNumber: '',
    };
    localFixture.detectChanges();

    const compiled = localFixture.nativeElement as HTMLElement;
    const whatsappBtn = compiled.querySelector('.whatsapp-btn') as HTMLButtonElement;
    expect(whatsappBtn).toBeTruthy();
    expect(whatsappBtn.disabled).toBe(true);
  });

  it('should enable WhatsApp button when assigned agent is present', () => {
    const localFixture = TestBed.createComponent(EnquiryDetails);
    const localComp = localFixture.componentInstance;
    localComp.enquiry = mockEnquiry;
    localFixture.detectChanges();

    const compiled = localFixture.nativeElement as HTMLElement;
    const whatsappBtn = compiled.querySelector('.whatsapp-btn') as HTMLButtonElement;
    expect(whatsappBtn).toBeTruthy();
    expect(whatsappBtn.disabled).toBe(false);
  });

  it('should open and close upload documents modal without navigating to external route', () => {
    const localFixture = TestBed.createComponent(EnquiryDetails);
    const localComp = localFixture.componentInstance;
    localComp.enquiry = mockEnquiry;
    localFixture.detectChanges();

    expect(localComp.showUploadDocsModal()).toBe(false);
    localComp.openUploadDocsModal();
    expect(localComp.showUploadDocsModal()).toBe(true);

    localComp.closeUploadDocsModal();
    expect(localComp.showUploadDocsModal()).toBe(false);
  });
});
