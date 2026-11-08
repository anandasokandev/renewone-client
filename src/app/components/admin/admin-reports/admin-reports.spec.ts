import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AdminReports } from './admin-reports';
import { EmployeeService } from '../../../services/employee/employee.service';
import { AccountService } from '../../../services/account/account.service';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { AdminEmployeeItem } from '../../../models/employee.model';
import { AgentListItem } from '../../../models/account.model';
import { InsuranceTypeItem, VehicleTypeItem } from '../../../models/enquiry.model';
import { environment } from '../../../../environments/environment';

describe('AdminReports', () => {
  let component: AdminReports;
  let fixture: ComponentFixture<AdminReports>;
  let httpTestingController: HttpTestingController;

  const mockEmployees: AdminEmployeeItem[] = [
    {
      id: 'emp-1',
      employeeId: 'EMP-01',
      employeeName: 'Alice Johnson',
      role: 'Underwriter',
      email: 'alice@example.com',
      phoneNumber: '9876543210',
      status: true,
      createdOn: '2025-01-01',
    },
    {
      id: 'emp-2',
      employeeId: 'EMP-02',
      employeeName: 'Bob Smith',
      role: 'Manager',
      email: 'bob@example.com',
      phoneNumber: '9876543211',
      status: true,
      createdOn: '2025-01-01',
    },
  ];

  const mockAgents: AgentListItem[] = [
    {
      accountId: 'acc-1',
      agentId: 'ag-1',
      agentName: 'Agent One',
      agencyName: 'Agency Alpha',
      email: 'ag1@example.com',
      phoneNumber: '9876543212',
      address: null,
      pincode: null,
      isApproved: true,
      status: 'Active',
      joinedOn: '2025-01-01',
    },
  ];

  const mockInsuranceTypes: InsuranceTypeItem[] = [
    { id: 'it-1', name: 'Comprehensive', isActive: true },
    { id: 'it-2', name: 'Third Party', isActive: true },
  ];

  const mockInsuranceCompanies = [
    { id: 'ic-1', companyName: 'Bajaj Allianz' },
    { id: 'ic-2', companyName: 'ICICI Lombard' },
  ];

  const mockVehicleTypes: VehicleTypeItem[] = [
    { id: 'vt-1', typeName: 'Two Wheeler', isActive: true },
    { id: 'vt-2', typeName: 'Private Car', isActive: true },
  ];

  const mockDefinitions = [
    {
      type: 1,
      name: 'Enquiry Pipeline Report',
      description: 'Detailed analysis of enquiry stages and assignments.',
      filters: [
        { key: 'employee', label: 'Employee', type: 'multiselect' },
        { key: 'agency', label: 'Agency', type: 'multiselect' },
        { key: 'insuranceType', label: 'Insurance Type', type: 'multiselect' },
        { key: 'insuranceCompany', label: 'Insurance Company', type: 'multiselect' },
        { key: 'vehicleType', label: 'Vehicle Type', type: 'multiselect' },
        { key: 'status', label: 'Status', type: 'multiselect' },
        { key: 'dateRange', label: 'Date Range', type: 'daterange' },
      ],
      columns: [
        { key: 'enquiryNumber', label: 'Enquiry #' },
        { key: 'customerName', label: 'Customer' },
      ],
      metrics: [
        { key: 'totalEnquiries', label: 'Total Enquiries', format: 'number' },
      ],
    },
  ];

  let employeeService: any;
  let accountService: any;
  let enquiryService: any;

  beforeEach(async () => {
    employeeService = {
      getAllEmployees: vi.fn().mockReturnValue(
        of({
          isSuccess: true,
          message: 'Success',
          data: {
            items: mockEmployees,
            pageNumber: 1,
            pageSize: 100,
            totalRecords: mockEmployees.length,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        })
      ),
    };

    accountService = {
      getAgents: vi.fn().mockReturnValue(
        of({
          isSuccess: true,
          message: 'Success',
          data: {
            summary: { activeAgents: 1, pendingApprovals: 0 },
            agents: {
              items: mockAgents,
              pageNumber: 1,
              pageSize: 100,
              totalRecords: mockAgents.length,
              totalPages: 1,
            },
          },
        })
      ),
    };

    enquiryService = {
      getInsuranceTypes: vi.fn().mockReturnValue(
        of({ isSuccess: true, message: 'Success', data: mockInsuranceTypes })
      ),
      getInsuranceCompanies: vi.fn().mockReturnValue(
        of({ isSuccess: true, message: 'Success', data: mockInsuranceCompanies })
      ),
      getVehicleTypes: vi.fn().mockReturnValue(
        of({ isSuccess: true, message: 'Success', data: mockVehicleTypes })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AdminReports],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmployeeService, useValue: employeeService },
        { provide: AccountService, useValue: accountService },
        { provide: EnquiryService, useValue: enquiryService },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminReports);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create and load lookups on init', () => {
    fixture.detectChanges();

    const req = httpTestingController.expectOne(`${environment.apiUrl}/EnquiryReports/definitions`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDefinitions);

    expect(component).toBeTruthy();
    expect(employeeService.getAllEmployees).toHaveBeenCalled();
    expect(accountService.getAgents).toHaveBeenCalled();
    expect(enquiryService.getInsuranceTypes).toHaveBeenCalled();
    expect(enquiryService.getInsuranceCompanies).toHaveBeenCalled();
    expect(enquiryService.getVehicleTypes).toHaveBeenCalled();

    expect(component.employees().length).toBe(2);
    expect(component.agencies().length).toBe(1);
    expect(component.insuranceTypes().length).toBe(2);
    expect(component.insuranceCompanies().length).toBe(2);
    expect(component.vehicleTypes().length).toBe(2);
  });

  it('should render dropdown selects for employee, agency, insurance type, insurance company, vehicle type, and status', async () => {
    fixture.detectChanges();

    const req = httpTestingController.expectOne(`${environment.apiUrl}/EnquiryReports/definitions`);
    req.flush(mockDefinitions);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const selects = compiled.querySelectorAll('.filters-grid select');
    expect(selects.length).toBeGreaterThanOrEqual(6);

    const labels = Array.from(compiled.querySelectorAll('.filters-grid .carbon-field-label')).map(
      (el) => el.textContent?.trim()
    );
    expect(labels).toContain('Employee');
    expect(labels).toContain('Agency');
    expect(labels).toContain('Insurance Type');
    expect(labels).toContain('Insurance Company');
    expect(labels).toContain('Vehicle Type');
    expect(labels).toContain('Status');
  });

  it('should update filter values when dropdown options are selected', () => {
    component.setFilterValue('employee', 'emp-1');
    component.setFilterValue('agency', 'acc-1');
    component.setFilterValue('insuranceType', 'it-1');
    component.setFilterValue('insuranceCompany', 'ic-1');
    component.setFilterValue('vehicleType', 'vt-1');
    component.setFilterValue('status', 'Submitted');

    expect(component.filterValue('employee')).toBe('emp-1');
    expect(component.filterValue('agency')).toBe('acc-1');
    expect(component.filterValue('insuranceType')).toBe('it-1');
    expect(component.filterValue('insuranceCompany')).toBe('ic-1');
    expect(component.filterValue('vehicleType')).toBe('vt-1');
    expect(component.filterValue('status')).toBe('Submitted');
    expect(component.hasActiveFilters()).toBe(true);
  });

  it('should reset filters when resetFilters is called', () => {
    component.fromDate.set('2025-01-01');
    component.toDate.set('2025-01-31');
    component.setFilterValue('employee', 'emp-1');
    expect(component.hasActiveFilters()).toBe(true);

    component.resetFilters();

    expect(component.fromDate()).toBe('');
    expect(component.toDate()).toBe('');
    expect(component.filterValues()).toEqual({});
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('should format request body with mapped array filters', () => {
    fixture.detectChanges();
    const req = httpTestingController.expectOne(`${environment.apiUrl}/EnquiryReports/definitions`);
    req.flush(mockDefinitions);

    component.setFilterValue('employee', 'emp-1');
    component.setFilterValue('agency', 'acc-1');
    component.setFilterValue('insuranceType', 'it-1');
    component.setFilterValue('insuranceCompany', 'ic-1');
    component.setFilterValue('vehicleType', 'vt-1');
    component.setFilterValue('status', 'Submitted');
    component.fromDate.set('2025-01-01');
    component.toDate.set('2025-01-31');

    component.generateReport(1);

    const generateReq = httpTestingController.expectOne(`${environment.apiUrl}/EnquiryReports/generate`);
    expect(generateReq.request.method).toBe('POST');
    const body = generateReq.request.body;
    expect(body.ReportType).toBe(1);
    expect(body.Filter.EmployeeIds).toEqual(['emp-1']);
    expect(body.Filter.AgencyIds).toEqual(['acc-1']);
    expect(body.Filter.InsuranceTypeIds).toEqual(['it-1']);
    expect(body.Filter.InsuranceCompanyIds).toEqual(['ic-1']);
    expect(body.Filter.VehicleTypeIds).toEqual(['vt-1']);
    expect(body.Filter.Statuses).toEqual(['Submitted']);
    expect(body.Filter.FromDate).toBe('2025-01-01');
    expect(body.Filter.ToDate).toBe('2025-01-31');

    generateReq.flush({
      reportType: 1,
      metrics: [{ key: 'totalEnquiries', label: 'Total Enquiries', value: 10, format: 'number' }],
      columns: [{ key: 'enquiryNumber', label: 'Enquiry #' }],
      data: { items: [{ enquiryNumber: 'ENQ-001' }], pageNumber: 1, pageSize: 25, totalRecords: 1, totalPages: 1 },
    });

    expect(component.result()).toBeTruthy();
    expect(component.result()?.data.totalRecords).toBe(1);
  });
});
