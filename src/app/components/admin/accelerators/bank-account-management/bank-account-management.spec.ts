import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankAccountManagement } from './bank-account-management';

describe('BankAccountManagement', () => {
  let component: BankAccountManagement;
  let fixture: ComponentFixture<BankAccountManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankAccountManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(BankAccountManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
