import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsuranceManagement } from './insurance-management';

describe('InsuranceManagement', () => {
  let component: InsuranceManagement;
  let fixture: ComponentFixture<InsuranceManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(InsuranceManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
