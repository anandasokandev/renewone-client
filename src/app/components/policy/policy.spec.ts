import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Policy } from './policy';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { PolicyPreviewData } from '../../models/enquiry.model';

describe('Policy', () => {
  let component: Policy;
  let fixture: ComponentFixture<Policy>;
  let enquirySpy: { getPolicyPreview: (id: string) => any };

  const mockPolicyData: PolicyPreviewData = {
    enquiryNumber: 'ENQ-0003',
    insuredCompanyName: 'ICICI Lombard',
    policyNumber: 'Test',
    policyStartDate: '2026-09-13',
    policyEndDate: '2027-09-12',
    policyUrl: 'vehicledocs/9b001ab5-36b8-4fde-b2bb-2194b59334d8/9640b5b0-fa7c-4098-96e1-699108a7ba15.jpg',
    policyIssuedBy: 'Anand Asokan',
    policyIssuedByPhone: '9744510308',
  };

  beforeEach(async () => {
    enquirySpy = {
      getPolicyPreview: (_id: string) =>
        of({
          isSuccess: true,
          data: mockPolicyData,
          message: 'Policy preview fetched successfully.',
          statusCode: 200,
          errors: null,
        }),
    };

    await TestBed.configureTestingModule({
      imports: [Policy],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: EnquiryService, useValue: enquirySpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Policy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch policy preview when enquiryId is set', () => {
    let requestedId = '';
    enquirySpy.getPolicyPreview = (id: string) => {
      requestedId = id;
      return of({
        isSuccess: true,
        data: mockPolicyData,
        message: 'Policy preview fetched successfully.',
        statusCode: 200,
        errors: null,
      });
    };

    component.enquiryId = 'ENQ-0003';
    component.fetchPolicyDetails('ENQ-0003');

    expect(requestedId).toBe('ENQ-0003');
    expect(component.policyData()).toEqual(mockPolicyData);
    expect(component.isPdfDoc()).toBe(false);
  });

  it('should detect PDF documents correctly', () => {
    component.policyData.set({
      ...mockPolicyData,
      policyUrl: 'documents/policy-test.pdf',
    });

    expect(component.isPdfDoc()).toBe(true);
    expect(component.safePdfResourceUrl()).toBeTruthy();
  });

  it('should toggle image zoom', () => {
    expect(component.isImageZoomed()).toBe(false);
    component.toggleZoom();
    expect(component.isImageZoomed()).toBe(true);
    component.toggleZoom();
    expect(component.isImageZoomed()).toBe(false);
  });

  it('should emit close when closeModal is called', () => {
    let emitted = false;
    component.close.subscribe(() => {
      emitted = true;
    });
    component.closeModal();
    expect(emitted).toBe(true);
  });
});
