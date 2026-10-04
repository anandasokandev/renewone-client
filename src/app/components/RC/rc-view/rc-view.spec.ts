import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RcView } from './rc-view';

describe('RcView', () => {
  let component: RcView;
  let fixture: ComponentFixture<RcView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RcView],
    }).compileComponents();

    fixture = TestBed.createComponent(RcView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
