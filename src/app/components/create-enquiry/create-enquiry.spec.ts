import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { CreateEnquiry } from './create-enquiry';
import { EnquiryService } from '../../services/enquiry/enquiry.service';

describe('CreateEnquiry', () => {
  let component: CreateEnquiry;
  let fixture: ComponentFixture<CreateEnquiry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEnquiry],
      providers: [
        provideRouter([{ path: 'enquiry', component: class {} }]),
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEnquiry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate Step 1 and proceed to Step 2', () => {
    expect(component.currentStep()).toBe(1);
    component.proceedToStep2();
    expect(component.currentStep()).toBe(1); // Invalid form remains in step 1

    component.step1Form.controls.customerName.setValue('Anand Kumar');
    component.step1Form.controls.contactNumber.setValue('9876543210');
    component.step1Form.controls.registrationNumber.setValue('KL02CB1234');
    expect(component.step1Form.valid).toBe(true);

    component.proceedToStep2();
    expect(component.currentStep()).toBe(2);
  });

  it('should properly map priority to 0, 1, 2', () => {
    component.selectPriority('Low');
    expect(component.priorityNumber).toBe(0);

    component.selectPriority('Medium');
    expect(component.priorityNumber).toBe(1);

    component.selectPriority('High');
    expect(component.priorityNumber).toBe(2);
  });

  it('should submit vehicle enquiry via API, advance to Step 3, and populate vehicle details', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    const mockApiResponse = {
      enquiryId: '0f33221e-2faa-4dce-8444-4089f084ac7e',
      brand: 'Hero Motocorp Ltd',
      model: 'Splendor+ Blk Stripe I3S (Drs)',
      manufactureYear: '3/2023',
      cubicCapacity: '97.2',
      fuelType: 'Petrol',
      submissionType: 'Comprehensive',
      engineNumber: 'HA11E7P5C15467',
      chassisNumber: 'MBLHAW220P5C65468',
    };

    (enquiryService as any).createVehicleEnquiry = (payload: any) =>
      of({ isSuccess: true, data: { ...payload, ...mockApiResponse }, message: 'Success' });

    component.step1Form.controls.customerName.setValue('Anand Kumar');
    component.step1Form.controls.contactNumber.setValue('9876543210');
    component.step1Form.controls.registrationNumber.setValue('KL02CB1234');
    component.proceedToStep2();

    component.selectPolicyType('Comprehensive');
    component.selectPriority('High');
    component.selectNcb(35);
    component.ownerChanged.set(true);
    component.previousClaim.set(false);

    component.createEnquiry();
    expect(component.currentStep()).toBe(3);

    const result = component.createdEnquiryResult()!;
    expect(result).toBeTruthy();
    expect(result.customerName).toBe('Anand Kumar');
    expect(result.customerNumber).toBe('9876543210');
    expect(result.vehicleNumber).toBe('KL02CB1234');
    expect(result.priority).toBe(2);
    expect(result.ncbPercentage).toBe(35);
    expect(result.isRCOwnerChanged).toBe(true);
    expect(result.submissionMode).toBe(1);

    // Verify 8 vehicle spec fields
    expect(result.brand).toBe('Hero Motocorp Ltd');
    expect(result.model).toBe('Splendor+ Blk Stripe I3S (Drs)');
    expect(result.manufactureYear).toBe('3/2023');
    expect(result.cubicCapacity).toBe('97.2');
    expect(result.fuelType).toBe('Petrol');
    expect(result.submissionType).toBe('Comprehensive');
    expect(result.engineNumber).toBe('HA11E7P5C15467');
    expect(result.chassisNumber).toBe('MBLHAW220P5C65468');
  });

  it('should reset NCB to 0 when previousClaim is true upon submission', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    (enquiryService as any).createVehicleEnquiry = (payload: any) =>
      of({ isSuccess: true, data: payload, message: 'Success' });

    component.step1Form.controls.customerName.setValue('Anand Kumar');
    component.step1Form.controls.contactNumber.setValue('9876543210');
    component.step1Form.controls.registrationNumber.setValue('KL02CB1234');
    component.proceedToStep2();

    component.selectNcb(50);
    component.previousClaim.set(true);

    component.createEnquiry();
    expect(component.currentStep()).toBe(3);
    const result = component.createdEnquiryResult()!;
    expect(result.ncbPercentage).toBe(0);
    expect(result.hasPreviousClaim).toBe(true);
  });

  it('should hide Previous Claim and NCB when policy type is Third Party, and reset previousClaim', async () => {
    component.step1Form.controls.customerName.setValue('Anand Kumar');
    component.step1Form.controls.contactNumber.setValue('9876543210');
    component.step1Form.controls.registrationNumber.setValue('KL02CB1234');
    component.proceedToStep2();
    fixture.detectChanges();

    // Default Comprehensive - Both should be visible in UI
    expect(component.isThirdParty()).toBe(false);
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Previous Claim');
    expect(compiled.textContent).toContain('No Claim Bonus (NCB)');

    // Select Third Party
    component.previousClaim.set(true);
    component.selectPolicyType('ThirdParty');
    fixture.detectChanges();

    expect(component.isThirdParty()).toBe(true);
    expect(component.previousClaim()).toBe(false); // Reset instantly
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Previous Claim');
    expect(compiled.textContent).not.toContain('No Claim Bonus (NCB)');

    // Switch back to Comprehensive - Both should be visible again
    component.selectPolicyType('Comprehensive');
    fixture.detectChanges();

    expect(component.isThirdParty()).toBe(false);
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Previous Claim');
    expect(compiled.textContent).toContain('No Claim Bonus (NCB)');
  });

  it('should set hasPreviousClaim to false and ncbPercentage to 0 when submitting Third Party policy', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    let capturedPayload: any;
    (enquiryService as any).createVehicleEnquiry = (payload: any) => {
      capturedPayload = payload;
      return of({ isSuccess: true, data: payload, message: 'Success' });
    };

    component.step1Form.controls.customerName.setValue('Anand Kumar');
    component.step1Form.controls.contactNumber.setValue('9876543210');
    component.step1Form.controls.registrationNumber.setValue('KL02CB1234');
    component.proceedToStep2();

    component.selectPolicyType('ThirdParty');
    component.selectNcb(35);
    component.ownerChanged.set(true);

    component.createEnquiry();
    expect(component.currentStep()).toBe(3);
    expect(capturedPayload.miPolicyType).toBe('ThirdParty');
    expect(capturedPayload.hasPreviousClaim).toBe(false);
    expect(capturedPayload.ncbPercentage).toBe(0);
  });

  it('should upload document via uploadDocument and update slot', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    let capturedPayload: any;
    (enquiryService as any).uploadDocument = (payload: any) => {
      capturedPayload = payload;
      return of({
        isSuccess: true,
        data: '0f94e33c-c447-4e30-8a34-1ace1f4894a3',
        message: 'Document uploaded successfully',
      });
    };

    const dummyFile = new File(['dummy-content'], 'rc-front.jpg', { type: 'image/jpeg' });
    component.createdEnquiryResult.set({
      enquiryId: 'enq-test-upload-123',
    } as any);
    component.uploadDocument(dummyFile, 'RC', 'Front');

    expect(capturedPayload).toBeTruthy();
    expect(capturedPayload.docType).toBe('RC');
    expect(capturedPayload.docSide).toBe('Front');
    expect(capturedPayload.file.name).toBe('rc-front.jpg');

    const slot = component.getDocSlot('RC', 'Front');
    expect(slot).toBeTruthy();
    expect(slot?.status).toBe('uploaded');
    expect(slot?.id).toBe('0f94e33c-c447-4e30-8a34-1ace1f4894a3');
    expect(slot?.fileName).toBe('rc-front.jpg');
  });

  it('should open and close preview lightbox modal', () => {
    const dummyDoc = {
      id: '0f94e33c-c447-4e30-8a34-1ace1f4894a3',
      docType: 'PreviousPolicy' as const,
      docSide: 'Front' as const,
      fileName: 'policy.pdf',
      fileSize: 102400,
      fileType: 'application/pdf',
      previewUrl: 'blob:http://localhost/test',
      uploadedAt: new Date().toISOString(),
      status: 'uploaded' as const,
    };

    expect(component.activePreviewDoc()).toBeNull();
    component.openPreview(dummyDoc);
    expect(component.activePreviewDoc()).toBe(dummyDoc);

    component.closePreview();
    expect(component.activePreviewDoc()).toBeNull();
  });

  it('should remove uploaded document', () => {
    const dummyFile = new File(['content'], 'id-back.png', { type: 'image/png' });
    const enquiryService = TestBed.inject(EnquiryService);
    (enquiryService as any).uploadDocument = (payload: any) =>
      of({ isSuccess: true, data: 'doc-123' });

    component.createdEnquiryResult.set({
      enquiryId: 'enq-test-upload-123',
    } as any);
    component.uploadDocument(dummyFile, 'Identity', 'Back');
    expect(component.getDocSlot('Identity', 'Back')).toBeTruthy();

    component.removeDocument('Identity', 'Back');
    expect(component.getDocSlot('Identity', 'Back')).toBeUndefined();
  });

  it('should initialize with single primary slot for each document type', () => {
    expect(component.docSlotsMap()['RC'].length).toBe(1);
    expect(component.docSlotsMap()['RC'][0].docSide).toBe('Front');

    expect(component.docSlotsMap()['Identity'].length).toBe(1);
    expect(component.docSlotsMap()['Identity'][0].docSide).toBe('Front');

    expect(component.docSlotsMap()['PreviousPolicy'].length).toBe(1);
    expect(component.docSlotsMap()['PreviousPolicy'][0].docSide).toBe('Front');

    expect(component.docSlotsMap()['VehicleImage'].length).toBe(1);
    expect(component.docSlotsMap()['VehicleImage'][0].docSide).toBe('Front');
  });

  it('should dynamically add and remove document slots per docType', () => {
    expect(component.canRemoveSlot('RC', 'Front')).toBe(false);

    // Add back side for RC
    component.addDocSlot('RC');
    expect(component.docSlotsMap()['RC'].length).toBe(2);
    expect(component.docSlotsMap()['RC'][1].docSide).toBe('Back');
    expect(component.canRemoveSlot('RC', 'Back')).toBe(true);

    // Add 3rd page for RC
    component.addDocSlot('RC');
    expect(component.docSlotsMap()['RC'].length).toBe(3);
    expect(component.docSlotsMap()['RC'][2].docSide).toBe('Page_3');

    // Remove the 3rd page slot
    component.removeDocSlot('RC', 'Page_3');
    expect(component.docSlotsMap()['RC'].length).toBe(2);
    expect(component.docSlotsMap()['RC'].map((s) => s.docSide)).toEqual(['Front', 'Back']);

    // Remove the back slot
    component.removeDocSlot('RC', 'Back');
    expect(component.docSlotsMap()['RC'].length).toBe(1);
    expect(component.canRemoveSlot('RC', 'Front')).toBe(false);
  });

  it('should submit vehicle enquiry for quote with enquiryId payload and navigate', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    let capturedPayload: any = null;
    (enquiryService as any).submitVehicleEnquiry = (payload: any) => {
      capturedPayload = payload;
      return of({ isSuccess: true, message: 'Submitted for quote' });
    };

    component.createdEnquiryResult.set({
      enquiryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      brand: 'Hero Motocorp Ltd',
    });

    component.submitForQuote();

    expect(capturedPayload).toEqual({ enquiryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });
    expect(component.isSubmittingQuote()).toBe(false);
    expect(component.successMessage()).toContain('Submitted for quote');
  });

  it('should set error message if enquiryId is missing during submitForQuote', () => {
    component.createdEnquiryResult.set(null);
    component.submitForQuote();
    expect(component.uploadErrorMessage()).toContain('Enquiry ID not found');
  });

  it('should load vehicle documents from API and populate slots', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    const mockDocs = [
      {
        id: '0f94e33c-c447-4e30-8a34-1ace1f4894a3',
        fileName: 'RC_Front',
        docType: 'RC',
        docSide: 'Front',
        uploadedUserIpAddress: '::1',
        uploadedUserName: null,
        url: 'vehicledocs/b3d14210-4ba4-4128-bfce-2ed973029d5a/b0ceffe5-5a60-4ecd-bb71-9689f563211a.pdf',
      },
      {
        id: '0f94e33c-c447-4e30-8a34-1ace1f4894a4',
        fileName: 'Identity_Back',
        docType: 'Identity',
        docSide: 'Back',
        uploadedUserIpAddress: '::1',
        uploadedUserName: null,
        url: 'vehicledocs/b3d14210-4ba4-4128-bfce-2ed973029d5a/photo.jpg',
      },
    ];

    (enquiryService as any).getVehicleDocuments = (enquiryId: string) =>
      of({ isSuccess: true, data: mockDocs });

    component.loadVehicleDocuments('enq-test-123');

    const rcFront = component.getDocSlot('RC', 'Front');
    expect(rcFront).toBeTruthy();
    expect(rcFront?.fileName).toBe('RC_Front');
    expect(rcFront?.status).toBe('uploaded');
    expect(rcFront?.fileType).toBe('application/pdf');
    expect(rcFront?.previewUrl).toContain('b0ceffe5-5a60-4ecd-bb71-9689f563211a.pdf');

    const idBack = component.getDocSlot('Identity', 'Back');
    expect(idBack).toBeTruthy();
    expect(idBack?.fileName).toBe('Identity_Back');
    expect(idBack?.status).toBe('uploaded');

    expect(component.uploadedDocsCount()).toBe(2);
  });

  it('should dismiss toast on dismissToast() call', () => {
    component.showSuccessToast('Test toast');
    expect(component.successMessage()).toBe('Test toast');

    component.dismissToast();
    expect(component.successMessage()).toBeNull();
  });

  it('should show instant quote modal when redirectToQuotes is true', () => {
    const enquiryService = TestBed.inject(EnquiryService);
    (enquiryService as any).submitVehicleEnquiry = () =>
      of({
        isSuccess: true,
        data: {
          enquiryId: 'b3d14210-4ba4-4128-bfce-2ed973029d5a',
          status: 'Submitted',
          redirectToQuotes: true,
        },
        message: 'Enquiry submitted successfully',
      });

    component.createdEnquiryResult.set({
      enquiryId: 'b3d14210-4ba4-4128-bfce-2ed973029d5a',
    });

    component.submitForQuote();

    expect(component.showInstantQuoteModal()).toBe(true);
    expect(component.quoteCountdownSeconds()).toBe(5);
    expect(component.quoteRedirectEnquiryId()).toBe('b3d14210-4ba4-4128-bfce-2ed973029d5a');
  });

  it('should cancel instant quote redirect modal when cancelInstantQuoteRedirect() is called', () => {
    component.showInstantQuoteModal.set(true);
    component.cancelInstantQuoteRedirect();
    expect(component.showInstantQuoteModal()).toBe(false);
  });

  it('should proceed to quotes on proceedToQuotes() call', () => {
    component.quoteRedirectEnquiryId.set('b3d14210-4ba4-4128-bfce-2ed973029d5a');
    component.showInstantQuoteModal.set(true);
    component.proceedToQuotes();
    expect(component.showInstantQuoteModal()).toBe(false);
  });
});


