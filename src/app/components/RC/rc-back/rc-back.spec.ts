import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RcBack } from './rc-back';

describe('RcBack', () => {
  let component: RcBack;
  let fixture: ComponentFixture<RcBack>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RcBack],
    }).compileComponents();

    fixture = TestBed.createComponent(RcBack);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
