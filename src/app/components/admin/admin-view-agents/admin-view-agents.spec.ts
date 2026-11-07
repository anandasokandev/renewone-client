import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminViewAgents } from './admin-view-agents';

describe('AdminViewAgents', () => {
  let component: AdminViewAgents;
  let fixture: ComponentFixture<AdminViewAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminViewAgents],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminViewAgents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
