import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEnquiry } from './admin-enquiry';

describe('AdminEnquiry', () => {
  let component: AdminEnquiry;
  let fixture: ComponentFixture<AdminEnquiry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEnquiry],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEnquiry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
