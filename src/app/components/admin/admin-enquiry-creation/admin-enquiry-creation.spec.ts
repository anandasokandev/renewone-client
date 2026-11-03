import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEnquiryCreation } from './admin-enquiry-creation';

describe('AdminEnquiryCreation', () => {
  let component: AdminEnquiryCreation;
  let fixture: ComponentFixture<AdminEnquiryCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEnquiryCreation],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEnquiryCreation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
