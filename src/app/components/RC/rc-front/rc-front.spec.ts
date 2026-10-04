import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RcFront } from './rc-front';

describe('RcFront', () => {
  let component: RcFront;
  let fixture: ComponentFixture<RcFront>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RcFront],
    }).compileComponents();

    fixture = TestBed.createComponent(RcFront);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
