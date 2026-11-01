import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrManagement } from './qr-management';

describe('QrManagement', () => {
  let component: QrManagement;
  let fixture: ComponentFixture<QrManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(QrManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
