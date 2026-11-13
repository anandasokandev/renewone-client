import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { InsuranceManagement } from './insurance-management';
import { InsuranceManagementService } from '../../../../services/insurance-management/insurance-management.service';
import { ApiResponse } from '../../../../models/response.model';
import { InsuranceTypeItem, VehicleTypeItem } from '../../../../models/insurance-management.model';

describe('InsuranceManagement', () => {
  let component: InsuranceManagement;
  let fixture: ComponentFixture<InsuranceManagement>;
  let service: InsuranceManagementService;

  const mockInsuranceTypes: ApiResponse<InsuranceTypeItem[]> = {
    isSuccess: true,
    data: [
      { id: 'ins-1', name: 'Comprehensive Motor', displayOrder: 1, isActive: true },
      { id: 'ins-2', name: 'Third Party Only', displayOrder: 2, isActive: false },
    ],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  const mockVehicleTypes: ApiResponse<VehicleTypeItem[]> = {
    isSuccess: true,
    data: [
      { id: 'veh-1', typeName: 'Two Wheeler', description: 'Motorcycles and Scooters', isActive: true },
      { id: 'veh-2', typeName: 'Commercial Vehicle', description: 'Trucks and Vans', isActive: false },
    ],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceManagement],
      providers: [
        InsuranceManagementService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    service = TestBed.inject(InsuranceManagementService);
    vi.spyOn(service, 'getInsuranceTypes').mockReturnValue(of(mockInsuranceTypes));
    vi.spyOn(service, 'getVehicleTypes').mockReturnValue(of(mockVehicleTypes));

    fixture = TestBed.createComponent(InsuranceManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load insurance types and vehicle types', () => {
    expect(component).toBeTruthy();
    expect(component.insuranceTypes().length).toBe(2);
    expect(component.vehicleTypes().length).toBe(2);
    expect(component.activeTab()).toBe('insurance');
  });

  it('should render desktop table and mobile cards for insurance types', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Desktop table
    const tableRows = compiled.querySelectorAll('#section-insurance-types .carbon-table-row');
    expect(tableRows.length).toBe(2);
    expect(tableRows[0].textContent).toContain('Comprehensive Motor');

    // Mobile cards
    const mobileCards = compiled.querySelectorAll('#section-insurance-types .exact-mobile-card');
    expect(mobileCards.length).toBe(2);
    expect(mobileCards[0].textContent).toContain('Comprehensive Motor');
    expect(mobileCards[0].textContent).toContain('Order: 1');
  });

  it('should switch tabs to vehicle types and render vehicle types table and cards', () => {
    component.setActiveTab('vehicle');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('vehicle');

    const compiled = fixture.nativeElement as HTMLElement;
    const tableRows = compiled.querySelectorAll('#section-vehicle-types .carbon-table-row');
    expect(tableRows.length).toBe(2);
    expect(tableRows[0].textContent).toContain('Two Wheeler');

    const mobileCards = compiled.querySelectorAll('#section-vehicle-types .exact-mobile-card');
    expect(mobileCards.length).toBe(2);
    expect(mobileCards[0].textContent).toContain('Two Wheeler');
    expect(mobileCards[0].textContent).toContain('Motorcycles and Scooters');
  });

  it('should filter insurance types by search and status', () => {
    component.insuranceSearch.set('Third');
    fixture.detectChanges();

    expect(component.filteredInsuranceTypes().length).toBe(1);
    expect(component.filteredInsuranceTypes()[0].name).toBe('Third Party Only');

    component.insuranceSearch.set('');
    component.insuranceStatusFilter.set('active');
    fixture.detectChanges();

    expect(component.filteredInsuranceTypes().length).toBe(1);
    expect(component.filteredInsuranceTypes()[0].id).toBe('ins-1');
  });

  it('should open and close insurance modal', () => {
    expect(component.isInsuranceModalOpen()).toBe(false);
    component.openCreateInsurance();
    expect(component.isInsuranceModalOpen()).toBe(true);
    expect(component.editingInsuranceId()).toBeNull();

    component.closeInsuranceModal();
    expect(component.isInsuranceModalOpen()).toBe(false);
  });

  it('should populate insurance modal for editing', () => {
    const item = component.insuranceTypes()[0];
    component.openEditInsurance(item);

    expect(component.isInsuranceModalOpen()).toBe(true);
    expect(component.editingInsuranceId()).toBe('ins-1');
    expect(component.insuranceForm.controls.name.value).toBe('Comprehensive Motor');
  });

  it('should toggle insurance type status', () => {
    vi.spyOn(service, 'toggleInsuranceTypeStatus').mockReturnValue(
      of({ isSuccess: true, data: true, message: 'Status updated', statusCode: 200, errors: null })
    );

    const item = component.insuranceTypes()[0];
    expect(item.isActive).toBe(true);

    component.toggleInsuranceStatus(item);
    expect(component.insuranceTypes()[0].isActive).toBe(false);
    expect(component.toastMessage()).toContain('is now Inactive');
  });

  it('should toggle vehicle type status', () => {
    vi.spyOn(service, 'toggleVehicleTypeStatus').mockReturnValue(
      of({ isSuccess: true, data: true, message: 'Status updated', statusCode: 200, errors: null })
    );

    component.setActiveTab('vehicle');
    const item = component.vehicleTypes()[0];
    expect(item.isActive).toBe(true);

    component.toggleVehicleStatus(item);
    expect(component.vehicleTypes()[0].isActive).toBe(false);
    expect(component.toastMessage()).toContain('is now Inactive');
  });
});
