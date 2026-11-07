import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankAccountDetails } from './bank-account-details';

describe('BankAccountDetails', () => {
  let component: BankAccountDetails;
  let fixture: ComponentFixture<BankAccountDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankAccountDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(BankAccountDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
