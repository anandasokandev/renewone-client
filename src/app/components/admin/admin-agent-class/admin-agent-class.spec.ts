import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAgentClass } from './admin-agent-class';

describe('AdminAgentClass', () => {
  let component: AdminAgentClass;
  let fixture: ComponentFixture<AdminAgentClass>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgentClass],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAgentClass);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
