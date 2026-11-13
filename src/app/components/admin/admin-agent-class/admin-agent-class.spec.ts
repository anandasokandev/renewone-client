import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AdminAgentClass } from './admin-agent-class';
import { AdminAgentClassService } from '../../../services/admin-agent-class/admin-agent-class.service';
import { ApiResponse } from '../../../models/response.model';
import { AdminAgentClass as AgentClass } from '../../../models/admin-agent-class.model';

describe('AdminAgentClass', () => {
  let component: AdminAgentClass;
  let fixture: ComponentFixture<AdminAgentClass>;
  let service: AdminAgentClassService;

  const mockClasses: ApiResponse<AgentClass[]> = {
    isSuccess: true,
    data: [
      {
        id: 'class-1',
        className: 'Diamond Partner',
        commSharePercentage: 15,
        isActive: true,
        agentCount: 5,
        agents: [],
      },
      {
        id: 'class-2',
        className: 'Gold Partner',
        commSharePercentage: 10,
        isActive: false,
        agentCount: 2,
        agents: [],
      },
    ],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgentClass],
      providers: [AdminAgentClassService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    service = TestBed.inject(AdminAgentClassService);
    vi.spyOn(service, 'getAll').mockReturnValue(of(mockClasses));

    fixture = TestBed.createComponent(AdminAgentClass);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load agent classes', () => {
    expect(component).toBeTruthy();
    expect(component.classes().length).toBe(2);
    expect(component.filteredClasses().length).toBe(2);
  });

  it('should render desktop table rows and mobile card list', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Desktop table
    const tableRows = compiled.querySelectorAll('.carbon-table-row');
    expect(tableRows.length).toBe(2);

    // Mobile cards
    const mobileCards = compiled.querySelectorAll('.agent-class-mobile-card');
    expect(mobileCards.length).toBe(2);

    const firstCard = mobileCards[0] as HTMLElement;
    expect(firstCard.textContent).toContain('Diamond Partner');
    expect(firstCard.textContent).toContain('15% Commission');

    // Requirements check: avoid status, agents, and edit icon
    expect(firstCard.querySelector('.carbon-tag')).toBeNull();
    expect(firstCard.querySelector('.carbon-toggle-switch')).toBeNull();
    expect(firstCard.textContent).not.toContain('Active');
    expect(firstCard.textContent).not.toContain('Inactive');
    expect(firstCard.textContent).not.toContain('agents');
    expect(firstCard.querySelector('.row-edit')).toBeNull();
    expect(firstCard.querySelector('.edit-svg')).toBeNull();
  });

  it('should trigger openEdit on clicking the mobile card row', () => {
    const openEditSpy = vi.spyOn(component, 'openEdit');
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.agent-class-mobile-card') as HTMLElement;

    firstCard.click();

    expect(openEditSpy).toHaveBeenCalledWith(component.classes()[0]);
    expect(component.modalOpen()).toBe(true);
    expect(component.editingId()).toBe('class-1');
    expect(component.form.controls.className.value).toBe('Diamond Partner');
    expect(component.form.controls.commSharePercentage.value).toBe(15);
  });

  it('should filter classes by search query', () => {
    component.search.set('gold');
    fixture.detectChanges();

    expect(component.filteredClasses().length).toBe(1);
    expect(component.filteredClasses()[0].className).toBe('Gold Partner');

    const compiled = fixture.nativeElement as HTMLElement;
    const mobileCards = compiled.querySelectorAll('.agent-class-mobile-card');
    expect(mobileCards.length).toBe(1);
    expect(mobileCards[0].textContent).toContain('Gold Partner');
  });

  it('should open and close create modal', () => {
    component.openCreate();
    expect(component.modalOpen()).toBe(true);
    expect(component.editingId()).toBeNull();
    expect(component.form.controls.className.value).toBe('');

    component.closeModal();
    expect(component.modalOpen()).toBe(false);
  });
});
