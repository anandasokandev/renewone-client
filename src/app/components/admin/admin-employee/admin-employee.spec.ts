import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEmployee } from './admin-employee';

describe('AdminEmployee', () => {
  let component: AdminEmployee;
  let fixture: ComponentFixture<AdminEmployee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEmployee],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEmployee);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
