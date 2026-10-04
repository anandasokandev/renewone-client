import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EnquiryUploadModal } from './enquiry-upload-modal';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { environment } from '../../../environments/environment';

describe('EnquiryUploadModal', () => {
  let component: EnquiryUploadModal;
  let fixture: ComponentFixture<EnquiryUploadModal>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnquiryUploadModal],
      providers: [provideHttpClient(), provideHttpClientTesting(), EnquiryService],
    }).compileComponents();

    fixture = TestBed.createComponent(EnquiryUploadModal);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the EnquiryUploadModal component', () => {
    component.enquiryId = 'test-enq-101';
    component.enquiryNumber = 'ENQ-101';
    fixture.detectChanges();

    const req1 = httpMock.expectOne(`${environment.apiUrl}/Enquiry/agent/enquiry-details/test-enq-101`);
    req1.flush({ isSuccess: true, data: { enquiryId: 'test-enq-101', customerName: 'Arun' } });

    const req2 = httpMock.expectOne(`${environment.apiUrl}/VehicleEnquiry/test-enq-101/documents`);
    req2.flush({ isSuccess: true, data: [] });

    expect(component).toBeTruthy();
    expect(component.effectiveEnquiryId()).toBe('test-enq-101');
    expect(component.displayEnquiryNumber()).toBe('ENQ-101');
  });

  it('should fetch vehicle documents from /api/VehicleEnquiry/{id}/documents and populate slots', () => {
    component.enquiryId = '42bce2a0-8f28-4a00-a25e-985035db6071';
    fixture.detectChanges();

    const req1 = httpMock.expectOne(`${environment.apiUrl}/Enquiry/agent/enquiry-details/42bce2a0-8f28-4a00-a25e-985035db6071`);
    req1.flush({ isSuccess: true, data: { enquiryId: '42bce2a0-8f28-4a00-a25e-985035db6071' } });

    const req2 = httpMock.expectOne(`${environment.apiUrl}/VehicleEnquiry/42bce2a0-8f28-4a00-a25e-985035db6071/documents`);
    req2.flush({
      isSuccess: true,
      data: [
        {
          id: 'doc-1',
          docType: 'RC',
          docSide: 'Front',
          fileName: 'rc_front.jpg',
          url: 'https://example.com/rc_front.jpg',
        },
      ],
    });

    expect(component.uploadedDocsCount()).toBe(1);
    const rcFront = component.getDocSlot('RC', 'Front');
    expect(rcFront).toBeTruthy();
    expect(rcFront?.fileName).toBe('rc_front.jpg');
    expect(rcFront?.status).toBe('uploaded');
  });

  it('should allow adding multiple document slots for RC', () => {
    component.enquiryId = 'test-enq-multi';
    fixture.detectChanges();

    const req1 = httpMock.expectOne(`${environment.apiUrl}/Enquiry/agent/enquiry-details/test-enq-multi`);
    req1.flush({ isSuccess: true, data: {} });

    const req2 = httpMock.expectOne(`${environment.apiUrl}/VehicleEnquiry/test-enq-multi/documents`);
    req2.flush({ isSuccess: true, data: [] });

    expect(component.docSlotsMap()['RC'].length).toBe(1);
    component.addDocSlot('RC');
    expect(component.docSlotsMap()['RC'].length).toBe(2);
    expect(component.docSlotsMap()['RC'][1].docSide).toBe('Back');

    component.addDocSlot('RC');
    expect(component.docSlotsMap()['RC'].length).toBe(3);
    expect(component.docSlotsMap()['RC'][2].docSide).toBe('Page_3');
  });

  it('should call submitVehicleEnquiry when submitForQuote is triggered', () => {
    component.enquiryId = 'submit-test-id';
    fixture.detectChanges();

    const req1 = httpMock.expectOne(`${environment.apiUrl}/Enquiry/agent/enquiry-details/submit-test-id`);
    req1.flush({ isSuccess: true, data: {} });

    const req2 = httpMock.expectOne(`${environment.apiUrl}/VehicleEnquiry/submit-test-id/documents`);
    req2.flush({ isSuccess: true, data: [] });

    let submittedPayload: any = null;
    component.submitted.subscribe((res) => {
      submittedPayload = res;
    });

    component.submitForQuote();
    expect(component.isSubmittingQuote()).toBe(true);

    const submitReq = httpMock.expectOne(`${environment.apiUrl}/VehicleEnquiry/submit-vehicle-enquiry`);
    expect(submitReq.request.method).toBe('POST');
    expect(submitReq.request.body).toEqual({ enquiryId: 'submit-test-id' });

    submitReq.flush({
      isSuccess: true,
      message: 'Vehicle enquiry submitted for quote successfully!',
      data: { enquiryId: 'submit-test-id', redirectToQuotes: false },
    });

    expect(component.isSubmittingQuote()).toBe(false);
    expect(submittedPayload).toEqual({ enquiryId: 'submit-test-id', redirectToQuotes: false });
  });

  it('should emit close event when closeModal is called', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    component.closeModal();
    expect(closed).toBe(true);
  });
});
