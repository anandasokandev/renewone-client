import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { VendorManagement } from './vendor-management';
import { VendorService } from '../../../../services/vendor/vendor.service';
import { Vendor } from '../../../../models/vendor.model';

const mockVendors: Vendor[] = Array.from({ length: 25 }, (_, i) => ({
  id: `${i + 1}`,
  code: `VND-00${i + 1}`,
  name: i === 0 ? 'Sunrise Insurance' : (i === 1 ? 'Horizon Tech' : `Vendor ${i + 1}`),
  email: `vendor${i + 1}@example.com`,
  phone: `+91 98765 432${(i + 10).toString().slice(-2)}`,
  isActive: i % 2 === 0,
}));

describe('VendorManagement', () => {
  let component: VendorManagement;
  let fixture: ComponentFixture<VendorManagement>;
  let vendorServiceMock: Partial<Record<keyof VendorService, any>>;

  beforeEach(async () => {
    vendorServiceMock = {
      getVendors: () => of({ isSuccess: true, data: mockVendors, message: '' }),
      createVendor: (req: any) => of({ isSuccess: true, data: { ...req, id: '99', isActive: true }, message: '' }),
      updateVendor: (id: string, req: any) => of({ isSuccess: true, data: { ...req, id }, message: '' }),
      toggleVendorStatus: (id: string) => of({ isSuccess: true, data: true, message: '' }),
      getVendor: (id: string) => of({ isSuccess: true, data: mockVendors[0], message: '' }),
    };

    await TestBed.configureTestingModule({
      imports: [VendorManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: VendorService, useValue: vendorServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load vendors and calculate summary stats correctly', () => {
    expect(component.vendors().length).toBe(25);
    expect(component.activeCount()).toBe(13);
    expect(component.inactiveCount()).toBe(12);
  });

  it('should display initial batch of records without paginator buttons', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Only initial batchSize (10) should be visible
    expect(component.visibleVendors().length).toBe(10);
    const tableRows = compiled.querySelectorAll('.carbon-table tbody tr');
    expect(tableRows.length).toBe(10);

    const mobileCards = compiled.querySelectorAll('.vendor-mobile-card');
    expect(mobileCards.length).toBe(10);

    // Client-side paginator bar should not exist in DOM
    const paginatorBar = compiled.querySelector('.carbon-pagination-bar');
    expect(paginatorBar).toBeNull();
  });

  it('should load next step of records when scrolling down / loadMore is called', () => {
    expect(component.visibleVendors().length).toBe(10);
    expect(component.hasMore()).toBe(true);

    component.loadMore();
    fixture.detectChanges();

    expect(component.visibleVendors().length).toBe(20);
    expect(component.hasMore()).toBe(true);

    // Call loadMore again for remaining records
    component.loadMore();
    fixture.detectChanges();

    expect(component.visibleVendors().length).toBe(25);
    expect(component.hasMore()).toBe(false);
  });

  it('should reset scroll batch when search query changes', () => {
    // Expand to 20
    component.loadMore();
    expect(component.visibleVendors().length).toBe(20);

    component.onSearchChange('sunrise');
    fixture.detectChanges();

    expect(component.displayedCount()).toBe(component.batchSize);
    expect(component.visibleVendors().length).toBe(1);
    expect(component.visibleVendors()[0].name).toBe('Sunrise Insurance');

    component.clearSearch();
    fixture.detectChanges();
    expect(component.filteredVendors().length).toBe(25);
    expect(component.visibleVendors().length).toBe(10);
  });

  it('should filter vendors by status and reset displayed count', () => {
    component.loadMore();
    expect(component.displayedCount()).toBe(20);

    component.setStatusFilter('active');
    expect(component.displayedCount()).toBe(component.batchSize);
    expect(component.filteredVendors().every(v => v.isActive)).toBe(true);

    component.setStatusFilter('inactive');
    expect(component.displayedCount()).toBe(component.batchSize);
    expect(component.filteredVendors().every(v => !v.isActive)).toBe(true);

    component.setStatusFilter('all');
    expect(component.filteredVendors().length).toBe(25);
  });

  it('should open and close the modal', () => {
    expect(component.isModalOpen()).toBe(false);

    component.openCreateModal();
    fixture.detectChanges();
    expect(component.isModalOpen()).toBe(true);

    component.closeModal();
    fixture.detectChanges();
    expect(component.isModalOpen()).toBe(false);
  });
});
