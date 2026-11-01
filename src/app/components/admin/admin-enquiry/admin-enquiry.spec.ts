import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminEnquiry } from './admin-enquiry';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import {
  AdminCommonQueueItem,
  AdminCommonQueuePagedData,
} from '../../../models/enquiry.model';
import { ApiResponse } from '../../../models/response.model';

describe('AdminEnquiry', () => {
  let component: AdminEnquiry;
  let fixture: ComponentFixture<AdminEnquiry>;
  let enquiryService: EnquiryService;
  let router: Router;

  const mockQueueItems: AdminCommonQueueItem[] = [
    {
      id: 'e1-uuid-1111',
      enquiryId: 'ENQ-55184',
      customerName: 'Rahul Verma',
      customerNumber: '9876543210',
      vehicleNumber: 'KL-07-CD-1234',
      vehicleType: 'Private Car',
      policyType: 'Comprehensive',
      insuranceType: 'Vehicle Insurance',
      status: 'Submitted',
      createdBy: 'Arun Kumar',
      createdByPhone: '9846645576',
      createdByRole: 'Agent',
      agencyName: 'Altrsync Agency',
      agencyNumber: 'AG-101',
      submittedOn: '2026-11-01T15:58:45.898Z',
      priority: 2, // Urgent
    },
    {
      id: 'e2-uuid-2222',
      enquiryId: 'ENQ-55185',
      customerName: 'Priya Nair',
      customerNumber: '9845112233',
      vehicleNumber: 'KL-01-AB-9988',
      vehicleType: 'Two Wheeler',
      policyType: 'Third Party',
      insuranceType: 'Vehicle Insurance',
      status: 'Created',
      createdBy: 'Samuel John',
      createdByPhone: '9744510308',
      createdByRole: 'Staff',
      agencyName: 'Direct Platform',
      agencyNumber: 'DIR-01',
      submittedOn: '2026-11-01T14:30:00.000Z',
      priority: 0, // Normal
    },
  ];

  const mockPagedResponse: ApiResponse<AdminCommonQueuePagedData> = {
    isSuccess: true,
    data: {
      items: mockQueueItems,
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: 'Common queue fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  const mockInsuranceTypes = [
    { id: 'ins-1', name: 'Vehicle Insurance', isActive: true },
    { id: 'ins-2', name: 'Health Insurance', isActive: true },
  ];

  const mockVehicleTypes = [
    { id: 'veh-1', typeName: 'Private Car', isActive: true },
    { id: 'veh-2', typeName: 'Two Wheeler', isActive: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEnquiry],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: EnquiryService,
          useValue: {
            getAdminCommonQueue: vi.fn().mockReturnValue(of(mockPagedResponse)),
            getInsuranceTypes: vi.fn().mockReturnValue(of({ isSuccess: true, data: mockInsuranceTypes })),
            getVehicleTypes: vi.fn().mockReturnValue(of({ isSuccess: true, data: mockVehicleTypes })),
            getAgentEnquiryDetails: vi.fn().mockReturnValue(of({ isSuccess: true, data: null })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEnquiry);
    component = fixture.componentInstance;
    enquiryService = TestBed.inject(EnquiryService);
    router = TestBed.inject(Router);
  });

  it('should create the component and load initial queue and dropdowns', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith({
      sortDescending: true,
      pageNumber: 1,
      pageSize: 4,
      search: undefined,
      insuranceTypeId: undefined,
      vehicleTypeId: undefined,
      fromDate: undefined,
      toDate: undefined,
      dateFilter: 1,
    });
    expect(enquiryService.getInsuranceTypes).toHaveBeenCalled();
    expect(enquiryService.getVehicleTypes).toHaveBeenCalled();
    expect(component.queueItems().length).toBe(2);
    expect(component.totalRecords()).toBe(2);
  });

  it('should render the 7 lifecycle stage tabs', () => {
    fixture.detectChanges();
    expect(component.stages.length).toBe(7);
    expect(component.stages[0].label).toContain('Enquiry Queue');

    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.stage-tab-btn');
    expect(tabButtons.length).toBe(7);
    expect(tabButtons[0].classList.contains('active')).toBe(true);
  });

  it('should render table rows with enquiry details and priority', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('ENQ-55184');
    expect(firstRowText).toContain('Urgent');
    expect(firstRowText).toContain('Rahul Verma');
    expect(firstRowText).toContain('9876543210');
    expect(firstRowText).toContain('KL-07-CD-1234');
    expect(firstRowText).toContain('Altrsync Agency');
    expect(firstRowText).toContain('Submitted');
  });

  it('should calculate priority labels and classes accurately', () => {
    fixture.detectChanges();
    expect(component.getPriorityLabel(2)).toBe('Urgent');
    expect(component.getPriorityLabel(1)).toBe('High');
    expect(component.getPriorityLabel(0)).toBe('Normal');

    expect(component.getPriorityClass(2)).toBe('priority-urgent');
    expect(component.getPriorityClass(1)).toBe('priority-high');
    expect(component.getPriorityClass(0)).toBe('priority-normal');

    expect(component.urgentCount()).toBe(1);
    expect(component.highPriorityCount()).toBe(0);
  });

  it('should filter queue by search query when submitted', () => {
    fixture.detectChanges();
    component.onSearchChange('Rahul');
    component.submitSearch();

    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Rahul',
        pageNumber: 1,
      })
    );
  });

  it('should clear search and reload queue', () => {
    fixture.detectChanges();
    component.searchQuery.set('Rahul');
    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        search: undefined,
        pageNumber: 1,
      })
    );
  });

  it('should filter queue by insurance line', () => {
    fixture.detectChanges();
    component.onInsuranceTypeChange('ins-1');

    expect(component.selectedInsuranceTypeId()).toBe('ins-1');
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        insuranceTypeId: 'ins-1',
        pageNumber: 1,
      })
    );
  });

  it('should filter queue by vehicle category', () => {
    fixture.detectChanges();
    component.onVehicleTypeChange('veh-1');

    expect(component.selectedVehicleTypeId()).toBe('veh-1');
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleTypeId: 'veh-1',
        pageNumber: 1,
      })
    );
  });

  it('should filter queue by date filter preset matching DateFilterType enum', () => {
    fixture.detectChanges();
    // Default is Today = 1
    expect(component.selectedDateFilter()).toBe(1);

    component.onDateFilterChange('2'); // Yesterday
    expect(component.selectedDateFilter()).toBe(2);
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFilter: 2,
        pageNumber: 1,
      })
    );

    component.onDateFilterChange('3'); // ThisWeek
    expect(component.selectedDateFilter()).toBe(3);

    component.onDateFilterChange('4'); // ThisMonth
    expect(component.selectedDateFilter()).toBe(4);

    component.onDateFilterChange('5'); // Custom
    expect(component.selectedDateFilter()).toBe(5);

    component.onDateFilterChange('6'); // ThisYear
    expect(component.selectedDateFilter()).toBe(6);
  });

  it('should handle custom date inputs when DateFilterType is Custom', () => {
    fixture.detectChanges();
    component.fromDate.set('2026-11-01');
    component.toDate.set('2026-11-02');
    component.onCustomDateChange();

    expect(component.selectedDateFilter()).toBe(5); // DateFilterType.Custom
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFilter: 5,
        fromDate: '2026-11-01',
        toDate: '2026-11-02',
      })
    );
  });

  it('should toggle sort order between newest and oldest', () => {
    fixture.detectChanges();
    expect(component.sortDescending()).toBe(true);

    component.toggleSortOrder();
    expect(component.sortDescending()).toBe(false);
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        sortDescending: false,
        pageNumber: 1,
      })
    );
  });

  it('should reset all filters to Today on reset button click', () => {
    fixture.detectChanges();
    component.searchQuery.set('Test');
    component.selectedInsuranceTypeId.set('ins-1');
    component.selectedDateFilter.set(3);

    component.resetAllFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedInsuranceTypeId()).toBe('All');
    expect(component.selectedDateFilter()).toBe(1); // DateFilterType.Today
    expect(component.sortDescending()).toBe(true);
  });

  it('should open and close enquiry details modal', () => {
    fixture.detectChanges();
    expect(component.selectedEnquiry()).toBeNull();

    component.openEnquiryDetails(mockQueueItems[0]);
    expect(component.selectedEnquiry()).toBeTruthy();
    expect(component.selectedEnquiry()?.enquiryId).toBe('ENQ-55184');

    component.closeDetailDrawer();
    expect(component.selectedEnquiry()).toBeNull();
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();
    component.totalPages.set(3);
    component.pageNumber.set(1);

    component.onPageChange(2);
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 2,
        pageSize: 10,
      })
    );

    component.onPageSizeChange(25);
    expect(enquiryService.getAdminCommonQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 1,
        pageSize: 25,
      })
    );
  });

  it('should generate valid WhatsApp URL', () => {
    expect(component.getWhatsAppUrl('9876543210')).toBe('https://wa.me/919876543210');
    expect(component.getWhatsAppUrl('+919876543210')).toBe('https://wa.me/919876543210');
  });

  it('should handle API errors with a toast notification', () => {
    vi.spyOn(enquiryService, 'getAdminCommonQueue').mockReturnValue(
      throwError(() => ({ error: { message: 'Network error occurred.' } }))
    );

    component.loadQueue();
    expect(component.toastMessage()).toBe('Network error occurred.');
    expect(component.toastType()).toBe('error');
  });

  it('should navigate to create enquiry on onNewEnquiry', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onNewEnquiry();
    expect(navigateSpy).toHaveBeenCalledWith(['/create-enquiry']);
  });

  it('should show toast message on onTransactions and onAssignQueue', () => {
    component.onTransactions();
    expect(component.toastMessage()).toContain('Transactions');
    expect(component.toastType()).toBe('info');

    component.onAssignQueue();
    expect(component.toastMessage()).toContain('assignment');
    expect(component.toastType()).toBe('info');
  });

  it('should export queue records to CSV or show error if empty', () => {
    fixture.detectChanges();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    component.exportQueueCsv();
    expect(component.toastMessage()).toContain('exported to CSV');
    expect(component.toastType()).toBe('success');
    clickSpy.mockRestore();

    // When empty
    component.queueItems.set([]);
    component.exportQueueCsv();
    expect(component.toastMessage()).toBe('No queue items to export.');
    expect(component.toastType()).toBe('error');
  });

  it('should accurately calculate priority counts', () => {
    fixture.detectChanges();
    expect(component.urgentCount()).toBe(1);
    expect(component.highPriorityCount()).toBe(0);
    expect(component.normalPriorityCount()).toBe(1);
  });
});
