import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEnquiryViewDetails } from './admin-enquiry-view-details';

describe('AdminEnquiryViewDetails', () => {
  let component: AdminEnquiryViewDetails;
  let fixture: ComponentFixture<AdminEnquiryViewDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEnquiryViewDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEnquiryViewDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
