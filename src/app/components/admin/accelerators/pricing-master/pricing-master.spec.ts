import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { PricingMaster } from './pricing-master';
import { PricingMasterService } from '../../../../services/pricing-master/pricing-master.service';
import { ApiResponse } from '../../../../models/response.model';
import {
  PricingAgentClassOption,
  PricingCompanyOption,
  PricingMasterItem,
  PricingMasterPage,
  PricingVehicleTypeOption,
} from '../../../../models/pricing-master.model';

describe('PricingMaster', () => {
  let component: PricingMaster;
  let fixture: ComponentFixture<PricingMaster>;
  let pricingService: PricingMasterService;

  const mockCompanies: ApiResponse<PricingCompanyOption[]> = {
    isSuccess: true,
    data: [{ id: 'comp-1', companyName: 'Bajaj Allianz' }],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  const mockAgentClasses: ApiResponse<PricingAgentClassOption[]> = {
    isSuccess: true,
    data: [{ id: 'class-1', className: 'Diamond', commSharePercentage: 15, isActive: true }],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  const mockVehicleTypes: ApiResponse<PricingVehicleTypeOption[]> = {
    isSuccess: true,
    data: [{ id: 'veh-1', typeName: 'Private Car', isActive: true }],
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  const mockPricingData: ApiResponse<PricingMasterPage> = {
    isSuccess: true,
    data: {
      items: [
        {
          id: 'price-1',
          insuranceCompanyId: 'comp-1',
          insuranceCompanyName: 'Bajaj Allianz',
          agentClassId: 'class-1',
          agentClassName: 'Diamond',
          vehicleTypeId: 'veh-1',
          vehicleTypeName: 'Private Car',
          fuelType: 'Petrol',
          minCC: 1000,
          maxCC: 1500,
          totalPremium: 3500,
          companyPayable: 2800,
          agentPoints: 400,
          adminProfit: 300,
          isActive: true,
        },
        {
          id: 'price-2',
          insuranceCompanyId: 'comp-1',
          insuranceCompanyName: 'HDFC Ergo',
          agentClassId: 'class-1',
          agentClassName: 'Diamond',
          vehicleTypeId: 'veh-1',
          vehicleTypeName: 'Two Wheeler',
          fuelType: 'Electric',
          minCC: 0,
          maxCC: 100,
          totalPremium: 1200,
          companyPayable: 900,
          agentPoints: 200,
          adminProfit: 100,
          isActive: false,
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: 'OK',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingMaster],
      providers: [PricingMasterService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    pricingService = TestBed.inject(PricingMasterService);
    vi.spyOn(pricingService, 'getInsuranceCompanies').mockReturnValue(of(mockCompanies));
    vi.spyOn(pricingService, 'getAgentClasses').mockReturnValue(of(mockAgentClasses));
    vi.spyOn(pricingService, 'getVehicleTypes').mockReturnValue(of(mockVehicleTypes));
    vi.spyOn(pricingService, 'getPricing').mockReturnValue(of(mockPricingData));

    fixture = TestBed.createComponent(PricingMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component and load pricing rules', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect(component.items().length).toBe(2);
    expect(component.totalRecords()).toBe(2);
    expect(component.pageActiveCount()).toBe(1);
    expect(component.pageInactiveCount()).toBe(1);
  });

  it('should render desktop table rows and mobile card list', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // Desktop table
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Bajaj Allianz');
    expect(rows[0].textContent).toContain('Diamond');
    expect(rows[0].textContent).toContain('Private Car');

    // Mobile cards
    const mobileList = compiled.querySelector('.pricing-mobile-list');
    expect(mobileList).toBeTruthy();
    const cards = mobileList?.querySelectorAll('.pricing-mobile-card');
    expect(cards?.length).toBe(2);
    expect(cards?.[0].textContent).toContain('Bajaj Allianz');
    expect(cards?.[0].textContent).toContain('Diamond');
  });

  it('should filter pricing rules by status', () => {
    const getPricingSpy = vi.spyOn(pricingService, 'getPricing');

    component.setFilter('active', 'active');
    expect(component.activeFilter()).toBe('active');
    expect(getPricingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, pageNumber: 1 })
    );

    component.setFilter('active', 'inactive');
    expect(component.activeFilter()).toBe('inactive');
    expect(getPricingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, pageNumber: 1 })
    );

    component.setFilter('active', 'all');
    expect(component.activeFilter()).toBe('all');
    expect(getPricingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: undefined, pageNumber: 1 })
    );
  });

  it('should append records when loadMorePricing is called', () => {
    const nextPageData: ApiResponse<PricingMasterPage> = {
      isSuccess: true,
      data: {
        items: [
          {
            id: 'price-3',
            insuranceCompanyId: 'comp-1',
            insuranceCompanyName: 'ICICI Lombard',
            agentClassId: 'class-1',
            agentClassName: 'Diamond',
            vehicleTypeId: 'veh-1',
            vehicleTypeName: 'Commercial',
            fuelType: 'Diesel',
            minCC: 2000,
            maxCC: 3000,
            totalPremium: 5000,
            companyPayable: 4000,
            agentPoints: 600,
            adminProfit: 400,
            isActive: true,
          },
        ],
        pageNumber: 2,
        pageSize: 10,
        totalRecords: 3,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      },
      message: 'OK',
      statusCode: 200,
      errors: null,
    };

    const getPricingSpy = vi.spyOn(pricingService, 'getPricing').mockReturnValue(of(nextPageData));
    component.totalPages.set(2);
    component.pageNumber.set(1);

    component.loadMorePricing();

    expect(getPricingSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumber: 2, pageSize: 10 })
    );
    expect(component.items().length).toBe(3);
    expect(component.items()[2].insuranceCompanyName).toBe('ICICI Lombard');
  });

  it('should toggle mobile filter expansion', () => {
    expect(component.isMobileFilterExpanded()).toBe(false);
    component.toggleMobileFilters();
    expect(component.isMobileFilterExpanded()).toBe(true);
    component.toggleMobileFilters();
    expect(component.isMobileFilterExpanded()).toBe(false);
  });

  it('should open and close create modal', () => {
    expect(component.isModalOpen()).toBe(false);
    component.openCreate();
    expect(component.isModalOpen()).toBe(true);
    expect(component.editingId()).toBeNull();

    component.closeModal();
    expect(component.isModalOpen()).toBe(false);
  });

  it('should render toggle switch in mobile cards and exclude Prem/Profit and status text', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.pricing-mobile-card');
    expect(cards.length).toBe(2);

    // Ensure Prem/Profit and text "Active" are not present in the mobile cards
    const firstCard = cards[0];
    expect(firstCard.textContent).not.toContain('Prem:');
    expect(firstCard.textContent).not.toContain('Profit:');

    // Toggle switch should be rendered
    const toggleButtons = compiled.querySelectorAll('.carbon-toggle-switch');
    expect(toggleButtons.length).toBe(2);
    expect(toggleButtons[0].classList.contains('checked')).toBe(true);
    expect(toggleButtons[1].classList.contains('checked')).toBe(false);
  });

  it('should toggle item active status when onToggleStatus is invoked', () => {
    const item = component.items()[0];
    expect(item.isActive).toBe(true);

    component.onToggleStatus(item);

    expect(component.items()[0].isActive).toBe(false);
    expect(component.notice()).toContain('is now Inactive');

    component.onToggleStatus(component.items()[0]);
    expect(component.items()[0].isActive).toBe(true);
    expect(component.notice()).toContain('is now Active');
  });
});
