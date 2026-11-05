import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminEnquiry } from './admin-enquiry';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { AccountService } from '../../../services/account/account.service';
import { Auth } from '../../../services/auth/auth';
import { ApiResponse } from '../../../models/response.model';
import {
  AdminAllEnquiriesPagedData,
  AdminAllEnquiryItem,
  AdminCommonQueuePagedData,
  AdminMyTaskItem,
  AdminMyTasksPagedData,
  AdminPolicyQueueItem,
  AdminPolicyQueuePagedData,
  AdminQuoteQueueItem,
  AdminQuoteQueuePagedData,
  DateFilterType,
  InsuranceTypeItem,
  PolicyQueueType,
  QuoteQueueType,
  SortDirectionEnum,
  VehicleTypeItem,
} from '../../../models/enquiry.model';
import { AgentsResponseData } from '../../../models/account.model';

describe('AdminEnquiry', () => {
  let component: AdminEnquiry;
  let fixture: ComponentFixture<AdminEnquiry>;
  let enquiryService: any;
  let accountService: any;
  let router: any;

  const mockCommonQueueResponse: ApiResponse<AdminCommonQueuePagedData> = {
    isSuccess: true,
    data: {
      pageNumber: 1,
      pageSize: 4,
      totalRecords: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      items: [
        {
          id: 'queue-1',
          enquiryId: 'ENQ-1001',
          customerName: 'Rahul Verma',
          customerNumber: '9846645576',
          vehicleNumber: 'KL-07-CD-1234',
          vehicleType: 'Private Car',
          policyType: 'Comprehensive',
          insuranceType: 'Vehicle Insurance',
          status: 'Created',
          createdBy: 'Arun',
          createdByPhone: '9846645576',
          createdByRole: 'Agent',
          agencyName: 'Altrsync Agency',
          agencyNumber: 'ALT-101',
          submittedOn: '2026-11-02T10:00:00Z',
          priority: 2,
        },
      ],
    },
    message: 'Queue fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  const mockAllEnquiriesResponse: ApiResponse<AdminAllEnquiriesPagedData> = {
    isSuccess: true,
    data: {
      pageNumber: 1,
      pageSize: 4,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      items: [
        {
          id: 'all-1',
          enquiryId: 'ENQ-2001',
          customerName: 'Samuel John',
          customerNumber: '9744510308',
          vehicleNumber: 'KL-01-AB-1234',
          vehicleType: 'Private Car',
          policyType: 'Comprehensive',
          insuranceType: 'Motor',
          createdBy: 'Arun Agent',
          createdByPhone: '9846645576',
          createdByRole: 'Agent',
          agencyName: 'Star Agency',
          submittedOn: '2026-11-02T10:00:00Z',
          status: 'Submitted',
          assignedEmployee: 'Samuel John',
          quoteCount: 2,
          priority: 1,
        },
        {
          id: 'all-2',
          enquiryId: 'ENQ-2002',
          customerName: 'Priya Nair',
          customerNumber: '9846645577',
          vehicleNumber: 'KL-07-CD-5678',
          vehicleType: 'Two Wheeler',
          policyType: 'Third Party',
          insuranceType: 'Motor',
          createdBy: 'Direct User',
          createdByPhone: '',
          createdByRole: 'Customer',
          agencyName: '',
          submittedOn: '2026-11-02T11:00:00Z',
          status: 'PolicyIssued',
          assignedEmployee: '',
          quoteCount: 0,
          priority: 0,
        },
      ],
    },
    message: 'Enquiries fetched successfully.',
    statusCode: 200,
    errors: null,
  };

  const mockMyTasksResponse: ApiResponse<AdminMyTasksPagedData> = {
    isSuccess: true,
    data: {
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      items: [
        {
          id: 'mytask-1',
          enquiryId: 'ENQ-TASK-1',
          customerName: 'Anand Asokan',
          customerNumber: '9744510308',
          vehicleNumber: 'KL-07-CD-1111',
          vehicleType: 'Private Car',
          policyType: 1,
          insuranceType: 'Vehicle Insurance',
          enquiryStatus: 2,
          createdBy: 'Agent Arun',
          createdByPhone: '9846645576',
          createdByRole: 'Agent',
          agencyName: 'Altrsync Agency',
          submittedOn: '2026-11-02T10:00:00Z',
          priority: 2,
        },
        {
          id: 'mytask-2',
          enquiryId: 'ENQ-TASK-2',
          customerName: 'Sanjay Dutt',
          customerNumber: '9846645599',
          vehicleNumber: 'KL-01-AB-2222',
          vehicleType: 'Two Wheeler',
          policyType: 2,
          insuranceType: 'Motor',
          enquiryStatus: 4,
          createdBy: 'Agent Priya',
          createdByPhone: '9846645577',
          createdByRole: 'Staff',
          agencyName: 'Star Agency',
          submittedOn: '2026-11-02T11:00:00Z',
          priority: 0,
        },
      ],
    },
    message: 'Enquiries fetched successfully',
    statusCode: 200,
    errors: null,
  };

  const mockInsuranceTypes: ApiResponse<InsuranceTypeItem[]> = {
    isSuccess: true,
    data: [
      { id: 'ins-1', name: 'Vehicle Insurance', isActive: true },
      { id: 'ins-2', name: 'Health Insurance', isActive: false },
    ],
    message: 'Success',
    statusCode: 200,
    errors: null,
  };

  const mockVehicleTypes: ApiResponse<VehicleTypeItem[]> = {
    isSuccess: true,
    data: [
      { id: 'veh-1', typeName: 'Private Car', description: '', isActive: true },
      { id: 'veh-2', typeName: 'Two Wheeler', description: '', isActive: true },
    ],
    message: 'Success',
    statusCode: 200,
    errors: null,
  };

  const mockAgents: ApiResponse<AgentsResponseData> = {
    isSuccess: true,
    data: {
      summary: { activeAgents: 1, pendingApprovals: 0 },
      agents: {
        items: [
          {
            accountId: 'acc-1',
            agentId: 'ALT-101',
            agentName: 'Arun Agent',
            agencyName: 'Altrsync Agency',
            email: 'arun@example.com',
            phoneNumber: '9846645576',
            address: null,
            pincode: '685588',
            isApproved: true,
            status: 'Active',
            joinedOn: '2026-06-07T07:11:15',
          },
        ],
        pageNumber: 1,
        pageSize: 100,
        totalRecords: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    },
    message: 'Success',
    statusCode: 200,
    errors: null,
  };

  const mockQuoteQueueResponse: ApiResponse<AdminQuoteQueuePagedData> = {
    isSuccess: true,
    data: {
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      items: [
        {
          id: 'quote-1',
          enquiryId: 'ENQ-QUOTE-1',
          customerName: 'Kavitha Nair',
          customerNumber: '9846645511',
          vehicleNumber: 'KL-07-CD-3333',
          vehicleType: 'Private Car',
          policyType: 'Comprehensive',
          insuranceType: 'Vehicle Insurance',
          createdBy: 'Agent Arun',
          createdByPhone: '9846645576',
          createdByRole: 'Agent',
          agencyName: 'Altrsync Agency',
          submittedOn: '2026-11-02T10:00:00Z',
          priority: 2,
          status: 'QuoteInProgress',
          adminAssisted: true,
          quoteCount: 1,
          currentStep: 'Step3',
          assignedEmployee: 'Employee Deepa',
          assignedEmployeeRole: 'Staff',
        },
        {
          id: 'quote-2',
          enquiryId: 'ENQ-QUOTE-2',
          customerName: 'Manoj Kumar',
          customerNumber: '9846645522',
          vehicleNumber: 'KL-01-AB-4444',
          vehicleType: 'Two Wheeler',
          policyType: 'Third Party',
          insuranceType: 'Motor',
          createdBy: 'Agent Priya',
          createdByPhone: '9846645577',
          createdByRole: 'Agent',
          agencyName: 'Star Agency',
          submittedOn: '2026-11-02T11:00:00Z',
          priority: 0,
          status: 'Quoted',
          adminAssisted: false,
          quoteCount: 3,
          currentStep: 'Step4',
          assignedEmployee: 'Employee Ravi',
          assignedEmployeeRole: 'Staff',
        },
      ],
    },
    message: 'Quote queue fetched successfully',
    statusCode: 200,
    errors: null,
  };

  const mockPolicyQueueResponse: ApiResponse<AdminPolicyQueuePagedData> = {
    isSuccess: true,
    data: {
      pageNumber: 1,
      pageSize: 10,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      items: [
        {
          id: 'policy-1',
          enquiryId: 'ENQ-POL-1',
          customerName: 'Anil Kapoor',
          customerNumber: '9846645533',
          vehicleNumber: 'KL-07-CD-5555',
          vehicleType: 'Private Car',
          policyType: 'Comprehensive',
          insuranceType: 'Vehicle Insurance',
          createdBy: 'Agent Arun',
          createdByPhone: '9846645576',
          createdByRole: 'Agent',
          agencyName: 'Altrsync Agency',
          submittedOn: '2026-11-02T10:00:00Z',
          priority: 2,
          status: 'PolicyInProgress',
          adminAssisted: true,
          quoteCount: 2,
          currentStep: 'PolicyCreation',
          assignedEmployee: 'Employee Deepa',
          assignedEmployeeRole: 'Staff',
        },
        {
          id: 'policy-2',
          enquiryId: 'ENQ-POL-2',
          customerName: 'Meera Nambiar',
          customerNumber: '9846645544',
          vehicleNumber: 'KL-01-AB-6666',
          vehicleType: 'Two Wheeler',
          policyType: 'Third Party',
          insuranceType: 'Motor',
          createdBy: 'Agent Priya',
          createdByPhone: '9846645577',
          createdByRole: 'Agent',
          agencyName: 'Star Agency',
          submittedOn: '2026-11-02T11:00:00Z',
          priority: 0,
          status: 'PolicyIssued',
          adminAssisted: false,
          quoteCount: 1,
          currentStep: 'PolicyIssued',
          assignedEmployee: 'Employee Ravi',
          assignedEmployeeRole: 'Staff',
        },
      ],
    },
    message: 'Policy queue fetched successfully',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    enquiryService = {
      getAdminCommonQueue: vi.fn().mockReturnValue(of(mockCommonQueueResponse)),
      getAdminAllEnquiries: vi.fn().mockReturnValue(of(mockAllEnquiriesResponse)),
      getAdminMyTasks: vi.fn().mockReturnValue(of(mockMyTasksResponse)),
      getAdminMyQuoteQueue: vi.fn().mockReturnValue(of(mockQuoteQueueResponse)),
      getAdminMyPolicyQueue: vi.fn().mockReturnValue(of(mockPolicyQueueResponse)),
      getInsuranceTypes: vi.fn().mockReturnValue(of(mockInsuranceTypes)),
      getVehicleTypes: vi.fn().mockReturnValue(of(mockVehicleTypes)),
    };
    accountService = {
      getAgents: vi.fn().mockReturnValue(of(mockAgents)),
    };
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminEnquiry],
      providers: [
        { provide: EnquiryService, useValue: enquiryService },
        { provide: AccountService, useValue: accountService },
        { provide: Router, useValue: router },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEnquiry);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and initialize default data', () => {
    expect(component).toBeTruthy();
    expect(component.activeStage()).toBe(1);
    expect(component.queueItems().length).toBe(1);
    expect(component.allEnquiriesItems().length).toBe(2);
    expect(component.myTasksItems().length).toBe(2);
    expect(component.insuranceTypes().length).toBe(1); // Only isActive: true
    expect(component.vehicleTypes().length).toBe(2);
    expect(component.accountOptions().length).toBe(1);
  });

  describe('Stage Selection & Navigation', () => {
    it('should switch between stages and trigger appropriate loading', () => {
      enquiryService.getAdminAllEnquiries.mockClear();
      component.onStageSelect(2);
      expect(component.activeStage()).toBe(2);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalled();

      enquiryService.getAdminMyTasks.mockClear();
      component.onStageSelect(3);
      expect(component.activeStage()).toBe(3);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalled();

      enquiryService.getAdminCommonQueue.mockClear();
      component.onStageSelect(1);
      expect(component.activeStage()).toBe(1);
      expect(enquiryService.getAdminCommonQueue).toHaveBeenCalled();

      component.onStageSelect(4);
      expect(component.activeStage()).toBe(4);
    });
  });

  describe('All Enquiries (Stage 2) Filtering & Pagination', () => {
    beforeEach(() => {
      component.onStageSelect(2);
      enquiryService.getAdminAllEnquiries.mockClear();
    });

    it('should query all enquiries with search filter and reset to page 1', () => {
      component.allEnquiriesPageNumber.set(2);
      component.onAllEnquiriesSearchChange('anand');
      component.submitAllEnquiriesSearch();

      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'anand',
          pageNumber: 1,
        })
      );
    });

    it('should clear all enquiries search', () => {
      component.allEnquiriesSearchQuery.set('anand');
      component.clearAllEnquiriesSearch();

      expect(component.allEnquiriesSearchQuery()).toBe('');
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalled();
    });

    it('should filter by enquiry status', () => {
      component.onAllEnquiriesStatusChange('2');

      expect(component.allEnquiriesSelectedStatus()).toBe(2);
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 2,
          pageNumber: 1,
        })
      );
    });

    it('should filter by insurance type', () => {
      component.onAllEnquiriesInsuranceTypeChange('ins-1');

      expect(component.allEnquiriesSelectedInsuranceTypeId()).toBe('ins-1');
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          insuranceTypeId: 'ins-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by vehicle type', () => {
      component.onAllEnquiriesVehicleTypeChange('veh-1');

      expect(component.allEnquiriesSelectedVehicleTypeId()).toBe('veh-1');
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleTypeId: 'veh-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by account', () => {
      component.onAllEnquiriesAccountChange('acc-1');

      expect(component.allEnquiriesSelectedAccountId()).toBe('acc-1');
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by date range enum and handle custom dates', () => {
      component.onAllEnquiriesDateFilterChange('4'); // ThisMonth

      expect(component.allEnquiriesSelectedDateFilter()).toBe(DateFilterType.ThisMonth);
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.ThisMonth,
        })
      );

      // Custom date range
      component.allEnquiriesSelectedDateFilter.set(DateFilterType.Custom);
      component.allEnquiriesFromDate.set('2026-11-01');
      component.allEnquiriesToDate.set('2026-11-03');
      component.onAllEnquiriesCustomDateChange();

      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.Custom,
          fromDate: '2026-11-01',
          toDate: '2026-11-03',
        })
      );
    });

    it('should toggle sort order in All Enquiries', () => {
      expect(component.allEnquiriesSortDescending()).toBe(true);
      component.toggleSortOrder();
      expect(component.allEnquiriesSortDescending()).toBe(false);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          sortDescending: false,
        })
      );
    });

    it('should change page in All Enquiries', () => {
      enquiryService.getAdminAllEnquiries.mockReturnValue(
        of({
          ...mockAllEnquiriesResponse,
          data: {
            ...mockAllEnquiriesResponse.data,
            pageNumber: 2,
            totalPages: 3,
          },
        })
      );
      component.allEnquiriesTotalPages.set(3);
      component.allEnquiriesPageNumber.set(1);

      component.onAllEnquiriesPageChange(2);
      expect(component.allEnquiriesPageNumber()).toBe(2);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 2,
        })
      );
    });

    it('should change page size in All Enquiries and reset to page 1', () => {
      enquiryService.getAdminAllEnquiries.mockReturnValue(
        of({
          ...mockAllEnquiriesResponse,
          data: {
            ...mockAllEnquiriesResponse.data,
            pageSize: 10,
          },
        })
      );
      component.allEnquiriesPageNumber.set(3);
      component.onAllEnquiriesPageSizeChange(10);

      expect(component.allEnquiriesPageSize()).toBe(10);
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 1,
          pageSize: 10,
        })
      );
    });

    it('should reset all filters to Today default in All Enquiries', () => {
      component.allEnquiriesSearchQuery.set('sample');
      component.allEnquiriesSelectedStatus.set(2);
      component.allEnquiriesSelectedInsuranceTypeId.set('ins-1');
      component.allEnquiriesSelectedDateFilter.set(DateFilterType.ThisMonth);

      component.resetAllFilters();

      expect(component.allEnquiriesSearchQuery()).toBe('');
      expect(component.allEnquiriesSelectedStatus()).toBe('All');
      expect(component.allEnquiriesSelectedInsuranceTypeId()).toBe('All');
      expect(component.allEnquiriesSelectedDateFilter()).toBe(DateFilterType.Today);
      expect(component.allEnquiriesPageNumber()).toBe(1);
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalled();
    });

    it('should refresh All Enquiries when active stage is 2', () => {
      component.refreshQueue();
      expect(enquiryService.getAdminAllEnquiries).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('All Enquiries refreshed');
    });

    it('should open enquiry detail drawer on All Enquiry row click', () => {
      const item: AdminAllEnquiryItem = mockAllEnquiriesResponse.data.items[0];
      const mockEvent = new MouseEvent('click');
      component.openAllEnquiryDetails(item, mockEvent);

      expect(component.selectedEnquiry()).toBeTruthy();
      expect(component.selectedEnquiry()?.enquiryId).toBe('ENQ-2001');
      expect(component.selectedEnquiry()?.customerName).toBe('Samuel John');
      expect(component.selectedEnquiry()?.assignedStaff).toBe('Samuel John');
    });

    it('should handle Assign to Me in All Enquiries', () => {
      const item: AdminAllEnquiryItem = mockAllEnquiriesResponse.data.items[0];
      const mockEvent = new MouseEvent('click');
      const stopSpy = vi.spyOn(mockEvent, 'stopPropagation');

      component.onAssignToMeAllEnquiry(item, mockEvent);
      expect(stopSpy).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('ENQ-2001');
    });

    it('should export All Enquiries to CSV', () => {
      component.exportQueueCsv();
      expect(component.toastMessage()).toContain('All enquiries exported to CSV');
    });
  });

  describe('My Tasks (Stage 3) Filtering & Pagination', () => {
    beforeEach(() => {
      component.onStageSelect(3);
      enquiryService.getAdminMyTasks.mockClear();
    });

    it('should query My Tasks with search filter and reset to page 1', () => {
      component.myTasksPageNumber.set(2);
      component.onMyTasksSearchChange('anand');
      component.submitMyTasksSearch();

      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'anand',
          pageNumber: 1,
        })
      );
    });

    it('should clear My Tasks search', () => {
      component.myTasksSearchQuery.set('anand');
      component.clearMyTasksSearch();

      expect(component.myTasksSearchQuery()).toBe('');
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalled();
    });

    it('should filter by enquiry status in My Tasks', () => {
      component.onMyTasksEnquiryStatusChange('2');

      expect(component.myTasksSelectedEnquiryStatus()).toBe(2);
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          enquiryStatus: 2,
          pageNumber: 1,
        })
      );
    });

    it('should filter by policy type in My Tasks', () => {
      component.onMyTasksPolicyTypeChange('1');

      expect(component.myTasksSelectedPolicyType()).toBe(1);
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          policyType: 1,
          pageNumber: 1,
        })
      );
    });

    it('should filter by insurance type in My Tasks', () => {
      component.onMyTasksInsuranceTypeChange('ins-1');

      expect(component.myTasksSelectedInsuranceTypeId()).toBe('ins-1');
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          insuranceTypeId: 'ins-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by vehicle type in My Tasks', () => {
      component.onMyTasksVehicleTypeChange('veh-1');

      expect(component.myTasksSelectedVehicleTypeId()).toBe('veh-1');
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleTypeId: 'veh-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by account in My Tasks', () => {
      component.onMyTasksAccountChange('acc-1');

      expect(component.myTasksSelectedAccountId()).toBe('acc-1');
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          pageNumber: 1,
        })
      );
    });

    it('should filter by date range enum and handle custom dates in My Tasks', () => {
      component.onMyTasksDateFilterChange('4'); // ThisMonth

      expect(component.myTasksSelectedDateFilter()).toBe(DateFilterType.ThisMonth);
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.ThisMonth,
        })
      );

      // Custom date range
      component.myTasksSelectedDateFilter.set(DateFilterType.Custom);
      component.myTasksFromDate.set('2026-11-01');
      component.myTasksToDate.set('2026-11-03');
      component.onMyTasksCustomDateChange();

      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.Custom,
          fromDate: '2026-11-01',
          toDate: '2026-11-03',
        })
      );
    });

    it('should toggle sort order in My Tasks', () => {
      expect(component.myTasksSortDirection()).toBe(SortDirectionEnum.Descending);
      component.toggleSortOrder();
      expect(component.myTasksSortDirection()).toBe(SortDirectionEnum.Ascending);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          sortDirection: SortDirectionEnum.Ascending,
        })
      );
    });

    it('should change page in My Tasks', () => {
      enquiryService.getAdminMyTasks.mockReturnValue(
        of({
          ...mockMyTasksResponse,
          data: {
            ...mockMyTasksResponse.data,
            pageNumber: 2,
            totalPages: 3,
          },
        })
      );
      component.myTasksTotalPages.set(3);
      component.myTasksPageNumber.set(1);

      component.onMyTasksPageChange(2);
      expect(component.myTasksPageNumber()).toBe(2);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 2,
        })
      );
    });

    it('should change page size in My Tasks and reset to page 1', () => {
      enquiryService.getAdminMyTasks.mockReturnValue(
        of({
          ...mockMyTasksResponse,
          data: {
            ...mockMyTasksResponse.data,
            pageSize: 25,
          },
        })
      );
      component.myTasksPageNumber.set(3);
      component.onMyTasksPageSizeChange(25);

      expect(component.myTasksPageSize()).toBe(25);
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 1,
          pageSize: 25,
        })
      );
    });

    it('should reset all filters to Today default in My Tasks', () => {
      component.myTasksSearchQuery.set('sample');
      component.myTasksSelectedEnquiryStatus.set(2);
      component.myTasksSelectedPolicyType.set(1);
      component.myTasksSelectedInsuranceTypeId.set('ins-1');
      component.myTasksSelectedDateFilter.set(DateFilterType.ThisMonth);

      component.resetAllFilters();

      expect(component.myTasksSearchQuery()).toBe('');
      expect(component.myTasksSelectedEnquiryStatus()).toBe('All');
      expect(component.myTasksSelectedPolicyType()).toBe('All');
      expect(component.myTasksSelectedInsuranceTypeId()).toBe('All');
      expect(component.myTasksSelectedDateFilter()).toBe(DateFilterType.Today);
      expect(component.myTasksPageNumber()).toBe(1);
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalled();
    });

    it('should refresh My Tasks when active stage is 3', () => {
      component.refreshQueue();
      expect(enquiryService.getAdminMyTasks).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('My Tasks refreshed');
    });

    it('should open enquiry detail drawer on My Tasks row click', () => {
      const item: AdminMyTaskItem = mockMyTasksResponse.data.items[0];
      const mockEvent = new MouseEvent('click');
      component.openMyTaskDetails(item, mockEvent);

      expect(component.selectedEnquiry()).toBeTruthy();
      expect(component.selectedEnquiry()?.enquiryId).toBe('ENQ-TASK-1');
      expect(component.selectedEnquiry()?.customerName).toBe('Anand Asokan');
      expect(component.selectedEnquiry()?.policyType).toBe('Comprehensive');
    });

    it('should export My Tasks to CSV', () => {
      component.exportQueueCsv();
      expect(component.toastMessage()).toContain('My Tasks enquiries exported to CSV');
    });
  });

  describe('Common Queue (Stage 1) Operations', () => {
    it('should refresh Common Queue when active stage is 1', () => {
      component.activeStage.set(1);
      enquiryService.getAdminCommonQueue.mockClear();

      component.refreshQueue();
      expect(enquiryService.getAdminCommonQueue).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('Enquiry Queue refreshed');
    });

    it('should toggle sort order in Common Queue', () => {
      component.activeStage.set(1);
      enquiryService.getAdminCommonQueue.mockClear();

      expect(component.sortDescending()).toBe(true);
      component.toggleSortOrder();
      expect(component.sortDescending()).toBe(false);
      expect(enquiryService.getAdminCommonQueue).toHaveBeenCalled();
    });

    it('should export Common Queue to CSV', () => {
      component.activeStage.set(1);
      component.exportQueueCsv();
      expect(component.toastMessage()).toContain('Common queue records exported to CSV');
    });

    it('should copy text to clipboard and show toast', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
      const mockEvent = new MouseEvent('click');
      const stopSpy = vi.spyOn(mockEvent, 'stopPropagation');

      component.copyToClipboard('ENQ-1001', 'Enquiry ID', mockEvent);
      await Promise.resolve();
      expect(stopSpy).toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ENQ-1001');
      expect(component.copiedField()).toBe('ENQ-1001');
    });
  });

  describe('Navigation & Actions', () => {
    it('should navigate to create-enquiry on New Enquiry click', () => {
      component.onNewEnquiry();
      expect(router.navigate).toHaveBeenCalledWith(['/create-enquiry']);
    });

    it('should show toast on Transactions click', () => {
      component.onTransactions();
      expect(component.toastMessage()).toContain('Transactions');
    });
  });

  describe('Helper Formatting Functions', () => {
    it('should format enquiry status labels correctly', () => {
      expect(component.getEnquiryStatusLabel(1)).toBe('Created');
      expect(component.getEnquiryStatusLabel('Submitted')).toBe('Submitted');
      expect(component.getEnquiryStatusLabel(6)).toBe('PolicyInProgress');
      expect(component.getEnquiryStatusLabel('PolicyIssued')).toBe('PolicyIssued');
      expect(component.getEnquiryStatusLabel(null)).toBe('Created');
    });

    it('should format enquiry status CSS classes correctly', () => {
      expect(component.getEnquiryStatusClass('PolicyIssued')).toBe('tag-success');
      expect(component.getEnquiryStatusClass('Submitted')).toBe('tag-active');
      expect(component.getEnquiryStatusClass('QuoteInProgress')).toBe('tag-progress');
      expect(component.getEnquiryStatusClass('PaymentVerificationPending')).toBe('tag-purple');
      expect(component.getEnquiryStatusClass('Cancelled')).toBe('tag-cancelled');
      expect(component.getEnquiryStatusClass('Unknown')).toBe('tag-default');
    });

    it('should calculate allEnquiriesShowingRangeText correctly', () => {
      component.allEnquiriesTotalRecords.set(0);
      expect(component.allEnquiriesShowingRangeText()).toBe('0 - 0 of 0 enquiries');

      component.allEnquiriesTotalRecords.set(15);
      component.allEnquiriesPageNumber.set(1);
      component.allEnquiriesPageSize.set(4);
      expect(component.allEnquiriesShowingRangeText()).toBe('1 - 4 of 15 enquiries');

      component.allEnquiriesPageNumber.set(4);
      expect(component.allEnquiriesShowingRangeText()).toBe('13 - 15 of 15 enquiries');
    });

    it('should format policy type labels correctly', () => {
      expect(component.getPolicyTypeLabel(1)).toBe('Comprehensive');
      expect(component.getPolicyTypeLabel(2)).toBe('Third Party');
      expect(component.getPolicyTypeLabel(3)).toBe('Own Damage');
      expect(component.getPolicyTypeLabel('ThirdParty')).toBe('Third Party');
      expect(component.getPolicyTypeLabel('OwnDamage')).toBe('Own Damage');
      expect(component.getPolicyTypeLabel('Comprehensive')).toBe('Comprehensive');
      expect(component.getPolicyTypeLabel(null)).toBe('Comprehensive');
    });

    it('should calculate myTasksShowingRangeText correctly', () => {
      component.myTasksTotalRecords.set(0);
      expect(component.myTasksShowingRangeText()).toBe('0 - 0 of 0 enquiries');

      component.myTasksTotalRecords.set(25);
      component.myTasksPageNumber.set(1);
      component.myTasksPageSize.set(10);
      expect(component.myTasksShowingRangeText()).toBe('1 - 10 of 25 enquiries');

      component.myTasksPageNumber.set(3);
      expect(component.myTasksShowingRangeText()).toBe('21 - 25 of 25 enquiries');
    });
  });

  describe('Error Handling', () => {
    it('should handle All Enquiries API error gracefully', () => {
      enquiryService.getAdminAllEnquiries.mockReturnValue(
        throwError(() => new Error('Server error'))
      );
      component.onStageSelect(2);
      component.loadAllEnquiries();

      expect(component.isAllEnquiriesLoading()).toBe(false);
      expect(component.toastMessage()).toContain('Failed to fetch all enquiries');
      expect(component.toastType()).toBe('error');
    });

    it('should handle My Tasks API error gracefully', () => {
      enquiryService.getAdminMyTasks.mockReturnValue(
        throwError(() => new Error('Server error'))
      );
      component.onStageSelect(3);
      component.loadMyTasks();

      expect(component.isMyTasksLoading()).toBe(false);
      expect(component.toastMessage()).toContain('Failed to fetch My Tasks');
      expect(component.toastType()).toBe('error');
    });

    it('should handle Common Queue API error gracefully', () => {
      enquiryService.getAdminCommonQueue.mockReturnValue(
        throwError(() => new Error('Server error'))
      );
      component.loadQueue();

      expect(component.isLoading()).toBe(false);
      expect(component.toastMessage()).toContain('Failed to fetch common queue');
      expect(component.toastType()).toBe('error');
    });

    it('should handle Quote Queue API error gracefully', () => {
      enquiryService.getAdminMyQuoteQueue.mockReturnValue(
        throwError(() => new Error('Server error'))
      );
      component.onStageSelect(4);
      component.loadQuoteQueue(QuoteQueueType.Quote);

      expect(component.isQuoteQueueLoading()).toBe(false);
      expect(component.toastMessage()).toContain('Failed to fetch quote queue');
      expect(component.toastType()).toBe('error');
    });

    it('should handle Policy Queue API error gracefully', () => {
      enquiryService.getAdminMyPolicyQueue.mockReturnValue(
        throwError(() => new Error('Server error'))
      );
      component.onStageSelect(6);
      component.loadPolicyQueue(PolicyQueueType.Policy);

      expect(component.isPolicyQueueLoading()).toBe(false);
      expect(component.toastMessage()).toContain('Failed to fetch policy queue');
      expect(component.toastType()).toBe('error');
    });
  });

  describe('Quote & Quoted Queue (Stages 4 & 5)', () => {
    it('should initialize and switch to Quote tab (Stage 4) with Type = 0', () => {
      component.onStageSelect(4);
      expect(component.activeStage()).toBe(4);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: QuoteQueueType.Quote,
          pageNumber: 1,
          pageSize: 10,
        })
      );
      expect(component.quoteQueueItems().length).toBe(2);
      expect(component.quoteTotalRecords()).toBe(2);
      expect(component.quoteQueueTotalPages()).toBe(1);
    });

    it('should switch to Quoted tab (Stage 5) with Type = 1', () => {
      component.onStageSelect(5);
      expect(component.activeStage()).toBe(5);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: QuoteQueueType.Quoted,
          pageNumber: 1,
          pageSize: 10,
        })
      );
      expect(component.quotedTotalRecords()).toBe(2);
    });

    it('should query quote queue with search filter and reset to page 1', () => {
      component.onStageSelect(4);
      component.quoteQueuePageNumber.set(3);

      component.onQuoteQueueSearchChange('Kavitha');
      expect(component.quoteQueueSearchQuery()).toBe('Kavitha');

      component.submitQuoteQueueSearch();
      expect(component.quoteQueuePageNumber()).toBe(1);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Kavitha',
          type: QuoteQueueType.Quote,
          pageNumber: 1,
        })
      );

      component.clearQuoteQueueSearch();
      expect(component.quoteQueueSearchQuery()).toBe('');
      expect(component.quoteQueuePageNumber()).toBe(1);
    });

    it('should filter quote queue by insurance type and vehicle type', () => {
      component.onStageSelect(4);

      component.onQuoteQueueInsuranceTypeChange('ins-1');
      expect(component.quoteQueueSelectedInsuranceTypeId()).toBe('ins-1');
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          insuranceTypeId: 'ins-1',
          type: QuoteQueueType.Quote,
        })
      );

      component.onQuoteQueueVehicleTypeChange('veh-1');
      expect(component.quoteQueueSelectedVehicleTypeId()).toBe('veh-1');
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleTypeId: 'veh-1',
          type: QuoteQueueType.Quote,
        })
      );
    });

    it('should filter quote queue by account agent', () => {
      component.onStageSelect(4);

      component.onQuoteQueueAccountChange('acc-1');
      expect(component.quoteQueueSelectedAccountId()).toBe('acc-1');
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          type: QuoteQueueType.Quote,
        })
      );
    });

    it('should handle predefined and custom date filters for quote queue', () => {
      component.onStageSelect(4);

      component.onQuoteQueueDateFilterChange('3'); // ThisWeek
      expect(component.quoteQueueSelectedDateFilter()).toBe(DateFilterType.ThisWeek);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.ThisWeek,
        })
      );

      component.onQuoteQueueDateFilterChange('5'); // Custom
      expect(component.quoteQueueSelectedDateFilter()).toBe(DateFilterType.Custom);

      component.quoteQueueFromDate.set('2026-11-01');
      component.quoteQueueToDate.set('2026-11-03');
      component.onQuoteQueueCustomDateChange();

      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.Custom,
          fromDate: '2026-11-01',
          toDate: '2026-11-03',
        })
      );
    });

    it('should handle quote queue pagination and page size changes', () => {
      component.onStageSelect(4);
      component.quoteQueueTotalPages.set(5);

      enquiryService.getAdminMyQuoteQueue.mockReturnValue(
        of({
          ...mockQuoteQueueResponse,
          data: {
            ...mockQuoteQueueResponse.data,
            pageNumber: 2,
            totalPages: 5,
          },
        })
      );

      component.onQuoteQueuePageChange(2);
      expect(component.quoteQueuePageNumber()).toBe(2);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 2,
        })
      );

      // Boundary: Out of bounds page
      component.onQuoteQueuePageChange(99);
      expect(component.quoteQueuePageNumber()).toBe(2);

      enquiryService.getAdminMyQuoteQueue.mockReturnValue(
        of({
          ...mockQuoteQueueResponse,
          data: {
            ...mockQuoteQueueResponse.data,
            pageSize: 20,
          },
        })
      );

      component.onQuoteQueuePageSizeChange(20);
      expect(component.quoteQueuePageSize()).toBe(20);
      expect(component.quoteQueuePageNumber()).toBe(1);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 1,
          pageSize: 20,
        })
      );
    });

    it('should toggle sort order in Quote and Quoted queue', () => {
      component.onStageSelect(4);
      expect(component.quoteQueueSortDescending()).toBe(true);

      component.toggleSortOrder();
      expect(component.quoteQueueSortDescending()).toBe(false);
      expect(enquiryService.getAdminMyQuoteQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          sortDescending: false,
        })
      );
    });

    it('should reset all filters in Quote queue', () => {
      component.onStageSelect(4);
      component.quoteQueueSearchQuery.set('custom search');
      component.quoteQueueSelectedInsuranceTypeId.set('ins-1');
      component.quoteQueueSelectedVehicleTypeId.set('veh-1');
      component.quoteQueueSelectedAccountId.set('acc-1');
      component.quoteQueueSelectedDateFilter.set(DateFilterType.Custom);
      component.quoteQueueFromDate.set('2026-11-01');
      component.quoteQueueToDate.set('2026-11-03');
      component.quoteQueueSortDescending.set(false);

      component.resetAllFilters();

      expect(component.quoteQueueSearchQuery()).toBe('');
      expect(component.quoteQueueSelectedInsuranceTypeId()).toBe('All');
      expect(component.quoteQueueSelectedVehicleTypeId()).toBe('All');
      expect(component.quoteQueueSelectedAccountId()).toBe('All');
      expect(component.quoteQueueSelectedDateFilter()).toBe(DateFilterType.Today);
      expect(component.quoteQueueSortDescending()).toBe(true);
      expect(component.toastMessage()).toContain('Quote filters have been reset');
    });

    it('should refresh quote and quoted queues with refreshQueue()', () => {
      component.onStageSelect(4);
      component.refreshQueue();
      expect(component.toastMessage()).toBe('Quote queue refreshed.');

      component.onStageSelect(5);
      component.refreshQueue();
      expect(component.toastMessage()).toBe('Quoted queue refreshed.');
    });

    it('should open quote queue details drawer', () => {
      const item: AdminQuoteQueueItem = mockQuoteQueueResponse.data.items[0];
      component.openQuoteQueueDetails(item);

      expect(component.selectedEnquiry()).toBeTruthy();
      expect(component.selectedEnquiry()?.enquiryId).toBe('ENQ-QUOTE-1');
      expect(component.selectedEnquiry()?.customerName).toBe('Kavitha Nair');
      expect(component.selectedEnquiry()?.assignedStaff).toBe('Employee Deepa');

      component.closeDetailDrawer();
      expect(component.selectedEnquiry()).toBeNull();
    });

    it('should navigate to enquiry quotes via onProcessQuote()', () => {
      const item: AdminQuoteQueueItem = mockQuoteQueueResponse.data.items[0];
      component.onProcessQuote(item);
      expect(router.navigate).toHaveBeenCalledWith(['/enquiry-quotes', 'quote-1']);
    });

    it('should export quote queue to CSV', () => {
      component.onStageSelect(4);
      component.quoteQueueItems.set(mockQuoteQueueResponse.data.items);

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      component.exportQueueCsv();

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('Quote queue exported to CSV');

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle export quote queue CSV when empty', () => {
      component.onStageSelect(4);
      component.quoteQueueItems.set([]);

      component.exportQueueCsv();
      expect(component.toastMessage()).toBe('No quote queue items to export.');
      expect(component.toastType()).toBe('error');
    });

    it('should calculate quoteQueueShowingRangeText correctly', () => {
      component.onStageSelect(4);
      component.quoteTotalRecords.set(0);
      expect(component.quoteQueueShowingRangeText()).toBe('0 - 0 of 0 enquiries');

      component.quoteTotalRecords.set(35);
      component.quoteQueuePageNumber.set(1);
      component.quoteQueuePageSize.set(10);
      expect(component.quoteQueueShowingRangeText()).toBe('1 - 10 of 35 enquiries');

      component.quoteQueuePageNumber.set(4);
      expect(component.quoteQueueShowingRangeText()).toBe('31 - 35 of 35 enquiries');
    });
  });

  describe('Policy & Policy Issued Queue (Stages 6 & 7)', () => {
    it('should initialize and switch to Policy tab (Stage 6) with Type = 0', () => {
      component.onStageSelect(6);
      expect(component.activeStage()).toBe(6);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PolicyQueueType.Policy,
          pageNumber: 1,
          pageSize: 10,
        })
      );
      expect(component.policyQueueItems().length).toBe(2);
      expect(component.policyTotalRecords()).toBe(2);
      expect(component.policyQueueTotalPages()).toBe(1);
    });

    it('should switch to Policy Issued tab (Stage 7) with Type = 1', () => {
      component.onStageSelect(7);
      expect(component.activeStage()).toBe(7);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PolicyQueueType.PolicyIssued,
          pageNumber: 1,
          pageSize: 10,
        })
      );
      expect(component.policyIssuedTotalRecords()).toBe(2);
    });

    it('should query policy queue with search filter and reset to page 1', () => {
      component.onStageSelect(6);
      component.policyQueuePageNumber.set(3);

      component.onPolicyQueueSearchChange('Anil');
      expect(component.policyQueueSearchQuery()).toBe('Anil');

      component.submitPolicyQueueSearch();
      expect(component.policyQueuePageNumber()).toBe(1);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Anil',
          type: PolicyQueueType.Policy,
          pageNumber: 1,
        })
      );

      component.clearPolicyQueueSearch();
      expect(component.policyQueueSearchQuery()).toBe('');
      expect(component.policyQueuePageNumber()).toBe(1);
    });

    it('should filter policy queue by status', () => {
      component.onStageSelect(6);

      component.onPolicyQueueStatusChange('6');
      expect(component.policyQueueSelectedStatus()).toBe(6);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 6,
          type: PolicyQueueType.Policy,
        })
      );

      component.onPolicyQueueStatusChange('All');
      expect(component.policyQueueSelectedStatus()).toBe('All');
    });

    it('should filter policy queue by insurance type and vehicle type', () => {
      component.onStageSelect(6);

      component.onPolicyQueueInsuranceTypeChange('ins-1');
      expect(component.policyQueueSelectedInsuranceTypeId()).toBe('ins-1');
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          insuranceTypeId: 'ins-1',
          type: PolicyQueueType.Policy,
        })
      );

      component.onPolicyQueueVehicleTypeChange('veh-1');
      expect(component.policyQueueSelectedVehicleTypeId()).toBe('veh-1');
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleTypeId: 'veh-1',
          type: PolicyQueueType.Policy,
        })
      );
    });

    it('should filter policy queue by account agent', () => {
      component.onStageSelect(6);

      component.onPolicyQueueAccountChange('acc-1');
      expect(component.policyQueueSelectedAccountId()).toBe('acc-1');
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          type: PolicyQueueType.Policy,
        })
      );
    });

    it('should handle predefined and custom date filters for policy queue', () => {
      component.onStageSelect(6);

      component.onPolicyQueueDateFilterChange('3'); // ThisWeek
      expect(component.policyQueueSelectedDateFilter()).toBe(DateFilterType.ThisWeek);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.ThisWeek,
        })
      );

      component.onPolicyQueueDateFilterChange('5'); // Custom
      expect(component.policyQueueSelectedDateFilter()).toBe(DateFilterType.Custom);

      component.policyQueueFromDate.set('2026-11-01');
      component.policyQueueToDate.set('2026-11-03');
      component.onPolicyQueueCustomDateChange();

      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFilter: DateFilterType.Custom,
          fromDate: '2026-11-01',
          toDate: '2026-11-03',
        })
      );
    });

    it('should handle policy queue pagination and page size changes', () => {
      component.onStageSelect(6);
      component.policyQueueTotalPages.set(5);

      enquiryService.getAdminMyPolicyQueue.mockReturnValue(
        of({
          ...mockPolicyQueueResponse,
          data: {
            ...mockPolicyQueueResponse.data,
            pageNumber: 2,
            totalPages: 5,
          },
        })
      );

      component.onPolicyQueuePageChange(2);
      expect(component.policyQueuePageNumber()).toBe(2);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 2,
        })
      );

      // Boundary: Out of bounds page
      component.onPolicyQueuePageChange(99);
      expect(component.policyQueuePageNumber()).toBe(2);

      enquiryService.getAdminMyPolicyQueue.mockReturnValue(
        of({
          ...mockPolicyQueueResponse,
          data: {
            ...mockPolicyQueueResponse.data,
            pageSize: 20,
          },
        })
      );

      component.onPolicyQueuePageSizeChange(20);
      expect(component.policyQueuePageSize()).toBe(20);
      expect(component.policyQueuePageNumber()).toBe(1);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          pageNumber: 1,
          pageSize: 20,
        })
      );
    });

    it('should toggle sort order in Policy and Policy Issued queue', () => {
      component.onStageSelect(6);
      expect(component.policyQueueSortDescending()).toBe(true);

      component.toggleSortOrder();
      expect(component.policyQueueSortDescending()).toBe(false);
      expect(enquiryService.getAdminMyPolicyQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          sortDescending: false,
        })
      );
    });

    it('should reset all filters in Policy queue', () => {
      component.onStageSelect(6);
      component.policyQueueSearchQuery.set('custom search');
      component.policyQueueSelectedStatus.set(6);
      component.policyQueueSelectedInsuranceTypeId.set('ins-1');
      component.policyQueueSelectedVehicleTypeId.set('veh-1');
      component.policyQueueSelectedAccountId.set('acc-1');
      component.policyQueueSelectedDateFilter.set(DateFilterType.Custom);
      component.policyQueueFromDate.set('2026-11-01');
      component.policyQueueToDate.set('2026-11-03');
      component.policyQueueSortDescending.set(false);

      component.resetAllFilters();

      expect(component.policyQueueSearchQuery()).toBe('');
      expect(component.policyQueueSelectedStatus()).toBe('All');
      expect(component.policyQueueSelectedInsuranceTypeId()).toBe('All');
      expect(component.policyQueueSelectedVehicleTypeId()).toBe('All');
      expect(component.policyQueueSelectedAccountId()).toBe('All');
      expect(component.policyQueueSelectedDateFilter()).toBe(DateFilterType.Today);
      expect(component.policyQueueSortDescending()).toBe(true);
      expect(component.toastMessage()).toContain('Policy filters have been reset');
    });

    it('should refresh policy and policy issued queues with refreshQueue()', () => {
      component.onStageSelect(6);
      component.refreshQueue();
      expect(component.toastMessage()).toBe('Policy queue refreshed.');

      component.onStageSelect(7);
      component.refreshQueue();
      expect(component.toastMessage()).toBe('Policy Issued queue refreshed.');
    });

    it('should open policy queue details drawer', () => {
      const item: AdminPolicyQueueItem = mockPolicyQueueResponse.data.items[0];
      component.openPolicyQueueDetails(item);

      expect(component.selectedEnquiry()).toBeTruthy();
      expect(component.selectedEnquiry()?.enquiryId).toBe('ENQ-POL-1');
      expect(component.selectedEnquiry()?.customerName).toBe('Anil Kapoor');
      expect(component.selectedEnquiry()?.assignedStaff).toBe('Employee Deepa');

      component.closeDetailDrawer();
      expect(component.selectedEnquiry()).toBeNull();
    });

    it('should navigate to policy preview via onProcessPolicy()', () => {
      const item: AdminPolicyQueueItem = mockPolicyQueueResponse.data.items[0];
      component.onProcessPolicy(item);
      expect(router.navigate).toHaveBeenCalledWith(['/policy', 'policy-1']);
    });

    it('should export policy queue to CSV', () => {
      component.onStageSelect(6);
      component.policyQueueItems.set(mockPolicyQueueResponse.data.items);

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      component.exportQueueCsv();

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(component.toastMessage()).toContain('Policy queue exported to CSV');

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle export policy queue CSV when empty', () => {
      component.onStageSelect(6);
      component.policyQueueItems.set([]);

      component.exportQueueCsv();
      expect(component.toastMessage()).toBe('No policy queue items to export.');
      expect(component.toastType()).toBe('error');
    });

    it('should calculate policyQueueShowingRangeText correctly', () => {
      component.onStageSelect(6);
      component.policyTotalRecords.set(0);
      expect(component.policyQueueShowingRangeText()).toBe('0 - 0 of 0 enquiries');

      component.policyTotalRecords.set(45);
      component.policyQueuePageNumber.set(1);
      component.policyQueuePageSize.set(10);
      expect(component.policyQueueShowingRangeText()).toBe('1 - 10 of 45 enquiries');

      component.policyQueuePageNumber.set(5);
      expect(component.policyQueueShowingRangeText()).toBe('41 - 45 of 45 enquiries');
    });
  });

  describe('User Permissions & Assignment Action Controls', () => {
    let authService: Auth;

    beforeEach(() => {
      authService = TestBed.inject(Auth);
    });

    it('should compute isSuperAdminOrSupervisor correctly based on userType', () => {
      // Null user
      authService.currentUser.set(null);
      expect(component.isSuperAdminOrSupervisor()).toBe(false);

      // SuperAdmin
      authService.currentUser.set({
        userId: 'u-1',
        token: 'token',
        fullName: 'Super Admin',
        userType: 'SuperAdmin',
        accountId: null,
      });
      expect(component.isSuperAdminOrSupervisor()).toBe(true);

      // Case insensitivity
      authService.currentUser.set({
        userId: 'u-1',
        token: 'token',
        fullName: 'Super Admin',
        userType: 'superadmin',
        accountId: null,
      });
      expect(component.isSuperAdminOrSupervisor()).toBe(true);

      // Supervisor
      authService.currentUser.set({
        userId: 'u-2',
        token: 'token',
        fullName: 'Supervisor User',
        userType: 'Supervisor',
        accountId: null,
      });
      expect(component.isSuperAdminOrSupervisor()).toBe(true);

      // AdminEmployee
      authService.currentUser.set({
        userId: 'u-3',
        token: 'token',
        fullName: 'Admin Employee',
        userType: 'AdminEmployee',
        accountId: null,
      });
      expect(component.isSuperAdminOrSupervisor()).toBe(false);

      // Agent
      authService.currentUser.set({
        userId: 'u-4',
        token: 'token',
        fullName: 'Agent User',
        userType: 'Agent',
        accountId: null,
      });
      expect(component.isSuperAdminOrSupervisor()).toBe(false);
    });

    it('should render Assign to Staff button only when user is SuperAdmin or Supervisor', () => {
      component.activeStage.set(1);

      // AdminEmployee should not see the Assign to Staff button
      authService.currentUser.set({
        userId: 'u-3',
        token: 'token',
        fullName: 'Admin Employee',
        userType: 'AdminEmployee',
        accountId: null,
      });
      fixture.detectChanges();

      let assignStaffBtn = fixture.nativeElement.querySelector('button[title="Assign to Staff"]');
      expect(assignStaffBtn).toBeNull();

      // SuperAdmin should see the Assign to Staff button
      authService.currentUser.set({
        userId: 'u-1',
        token: 'token',
        fullName: 'Super Admin',
        userType: 'SuperAdmin',
        accountId: null,
      });
      fixture.detectChanges();

      assignStaffBtn = fixture.nativeElement.querySelector('button[title="Assign to Staff"]');
      expect(assignStaffBtn).not.toBeNull();

      // Supervisor should see the Assign to Staff button
      authService.currentUser.set({
        userId: 'u-2',
        token: 'token',
        fullName: 'Supervisor User',
        userType: 'Supervisor',
        accountId: null,
      });
      fixture.detectChanges();

      assignStaffBtn = fixture.nativeElement.querySelector('button[title="Assign to Staff"]');
      expect(assignStaffBtn).not.toBeNull();
    });

    it('should render Self Assign button with self-assign-btn class and proper attributes', () => {
      component.activeStage.set(1);
      fixture.detectChanges();

      const selfAssignBtn = fixture.nativeElement.querySelector('.self-assign-btn');
      expect(selfAssignBtn).not.toBeNull();
      expect(selfAssignBtn.getAttribute('title')).toBe('Self Assign (Assign to Me)');
      expect(selfAssignBtn.querySelector('polyline')).not.toBeNull();
    });
  });
});
