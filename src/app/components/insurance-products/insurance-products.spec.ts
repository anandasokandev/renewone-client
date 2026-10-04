import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { InsuranceProducts } from './insurance-products';

describe('InsuranceProducts', () => {
  let component: InsuranceProducts;
  let fixture: ComponentFixture<InsuranceProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceProducts],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InsuranceProducts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
