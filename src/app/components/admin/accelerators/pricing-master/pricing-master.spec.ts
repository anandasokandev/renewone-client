import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PricingMaster } from './pricing-master';

describe('PricingMaster', () => {
  let component: PricingMaster;
  let fixture: ComponentFixture<PricingMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingMaster],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
