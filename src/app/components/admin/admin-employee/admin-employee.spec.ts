import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AdminEmployee } from './admin-employee';
import { EmployeeService } from '../../../services/employee/employee.service';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { AdminEmployeeItem, AdminEmployeePagedData } from '../../../models/employee.model';
import { ApiResponse } from '../../../models/response.model';

describe('AdminEmployee', () => {
  let component: AdminEmployee;
  let fixture: ComponentFixture<AdminEmployee>;
  let employeeService: EmployeeService;

  const mockEmployees: AdminEmployeeItem[] = [
    {
      id: '5bd52b4a-1f1a-4aaf-bc98-6f82ae8e63d4',
      employeeId: 'EMP-0001',
      employeeName: 'Samuel John',
      email: 'samuel@gmail.com',
      phoneNumber: '9744510308',
      role: 'AdminEmployee',
      status: true,
      activeTask: 0,
      completedTask: 0,
      createdOn: '2026-11-01T15:58:45.8983542',
    },
    {
      id: '9cf63a12-882b-4fa8-b221-729ab9021234',
      employeeId: 'EMP-0002',
      employeeName: 'Sarah Jenkins',
      email: 'sarah.j@renew1.in',
      phoneNumber: '9845112233',
      role: 'Supervisor',
      status: false,
      activeTask: 2,
      completedTask: 5,
      createdOn: '2026-10-15T10:20:00.0000000',
    },
  ];

  const mockPagedResponse: ApiResponse<AdminEmployeePagedData> = {
    isSuccess: true,
    data: {
      items: mockEmployees,
      pageNumber: 1,
      pageSize: 5,
      totalRecords: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: 'Employees fetched successfully',
    statusCode: 200,
    errors: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminEmployee],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: EmployeeService,
          useValue: {
            getAllEmployees: vi.fn().mockReturnValue(of(mockPagedResponse)),
            toggleEmployeeStatus: vi.fn().mockReturnValue(of({ isSuccess: true })),
            createInternalUser: vi.fn().mockReturnValue(of({ isSuccess: true, data: true, message: 'Employee created' })),
            updateEmployee: vi.fn().mockReturnValue(of({ isSuccess: true, data: true, message: 'Employee updated' })),
            getEmployeeRights: vi.fn().mockReturnValue(of({
              isSuccess: true,
              data: {
                userId: mockEmployees[0].id,
                fullName: mockEmployees[0].employeeName,
                userType: mockEmployees[0].role,
                workAllocations: [{ insuranceTypeId: 'vehicle-insurance', vehicleTypeIds: ['car'] }],
                modulePermissions: ['Dashboard'],
              },
              message: 'Rights fetched',
            })),
            updateEmployeeRights: vi.fn().mockReturnValue(of({ isSuccess: true, data: true, message: 'Rules updated' })),
          },
        },
        {
          provide: EnquiryService,
          useValue: {
            getInsuranceTypes: vi.fn().mockReturnValue(of({
              isSuccess: true,
              data: [{ id: 'vehicle-insurance', name: 'Vehicle Insurance', isActive: true }],
            })),
            getVehicleTypes: vi.fn().mockReturnValue(of({
              isSuccess: true,
              data: [{ id: 'car', typeName: 'Car', isActive: true }],
            })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEmployee);
    component = fixture.componentInstance;
    employeeService = TestBed.inject(EmployeeService);
  });

  it('should create component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load employees on init with default payload', () => {
    fixture.detectChanges();
    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 1,
      PageSize: 5,
    });
    expect(component.employees().length).toBe(2);
    expect(component.totalRecords()).toBe(2);
    expect(component.totalPages()).toBe(1);
  });

  it('should render table rows and columns properly', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    const firstRowText = rows[0].textContent;
    expect(firstRowText).toContain('EMP-0001');
    expect(firstRowText).toContain('Samuel John');
    expect(firstRowText).toContain('samuel@gmail.com');
    expect(firstRowText).toContain('9744510308');
    expect(firstRowText).toContain('Active');
  });

  it('should filter employees client-side by active status', () => {
    fixture.detectChanges();
    component.onStatusFilterChange('Active');
    fixture.detectChanges();

    expect(component.filteredEmployees().length).toBe(1);
    expect(component.filteredEmployees()[0].employeeName).toBe('Samuel John');
  });

  it('should filter employees client-side by inactive status', () => {
    fixture.detectChanges();
    component.onStatusFilterChange('Inactive');
    fixture.detectChanges();

    expect(component.filteredEmployees().length).toBe(1);
    expect(component.filteredEmployees()[0].employeeName).toBe('Sarah Jenkins');
  });

  it('should search employees by search query and submit to service', () => {
    fixture.detectChanges();
    component.onSearchChange('Samuel');
    component.submitSearch();

    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: 'Samuel',
      PageNumber: 1,
      PageSize: 5,
    });
  });

  it('should clear search and reload employees', () => {
    fixture.detectChanges();
    component.searchQuery.set('Samuel');
    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(component.pageNumber()).toBe(1);
    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 1,
      PageSize: 5,
    });
  });

  it('should trigger optimistic toggle and call toggleEmployeeStatus on toggle click', () => {
    fixture.detectChanges();
    const target = mockEmployees[0]; // Samuel John, status: true
    expect(component.employees()[0].status).toBe(true);

    component.onToggleStatus(target);
    expect(component.employees()[0].status).toBe(false);
    expect(employeeService.toggleEmployeeStatus).toHaveBeenCalledWith(target.id);
    expect(component.toastMessage()).toContain('Inactive');
  });

  it('should revert optimistic status update if toggle fails', () => {
    vi.spyOn(employeeService, 'toggleEmployeeStatus').mockReturnValue(
      throwError(() => new Error('Toggle error'))
    );
    fixture.detectChanges();

    const target = mockEmployees[0];
    component.onToggleStatus(target);

    // After failure, status should revert back to original
    expect(component.employees()[0].status).toBe(true);
    expect(component.toastMessage()).toContain('Failed to update employee status');
  });

  it('should open the rules manager and load current rights', () => {
    fixture.detectChanges();
    component.onManageRights(mockEmployees[0]);
    expect(component.modalMode()).toBe('rights');
    expect(component.modulePermissions()).toEqual(['Dashboard']);
    expect(component.selectedInsuranceTypeIds()).toEqual(['vehicle-insurance']);
    expect(component.isVehicleTypeSelected('vehicle-insurance', 'car')).toBe(true);
  });

  it('should save changed employee rules', () => {
    fixture.detectChanges();
    component.onManageRights(mockEmployees[0]);
    component.toggleModulePermission('Reports', true);
    component.submitEmployeeForm();

    expect(employeeService.updateEmployeeRights).toHaveBeenCalledWith({
      UserId: mockEmployees[0].id,
      ModulePermissions: ['Dashboard', 'Reports'],
      WorkAllocations: [{ InsuranceTypeId: 'vehicle-insurance', VehicleTypeIds: ['car'] }],
    });
    expect(component.modalMode()).toBeNull();
  });

  it('should update employee details from the edit dialog', () => {
    fixture.detectChanges();
    component.onEditEmployee(mockEmployees[0]);
    component.fullName.set('Samuel J');
    component.email.set('samuel.j@example.com');
    component.phoneNumber.set('9744510308');
    component.submitEmployeeForm();
    expect(employeeService.updateEmployee).toHaveBeenCalledWith({
      UserId: mockEmployees[0].id,
      FullName: 'Samuel J',
      Email: 'samuel.j@example.com',
      PhoneNumber: '9744510308',
    });
    expect(component.modalMode()).toBeNull();
  });

  it('should create an employee with the selected module and work allocation rules', () => {
    fixture.detectChanges();
    component.onAddEmployee();
    component.fullName.set('Alex Employee');
    component.userName.set('alex');
    component.email.set('alex@example.com');
    component.phoneNumber.set('1234567890');
    component.password.set('securepass');
    component.toggleModulePermission('Dashboard', true);
    component.toggleInsuranceType('vehicle-insurance', true);
    component.toggleVehicleType('vehicle-insurance', 'car', true);
    component.submitEmployeeForm();

    expect(employeeService.createInternalUser).toHaveBeenCalledWith({
      UserName: 'alex',
      FullName: 'Alex Employee',
      Email: 'alex@example.com',
      PhoneNumber: '1234567890',
      Password: 'securepass',
      UserType: 'AdminEmployee',
      ModulePermissions: ['Dashboard'],
      WorkAllocations: [{ InsuranceTypeId: 'vehicle-insurance', VehicleTypeIds: ['car'] }],
    });
    expect(component.modalMode()).toBeNull();
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();
    component.totalPages.set(3);
    component.pageNumber.set(1);

    component.onPageChange(2);
    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 2,
      PageSize: 5,
    });

    component.onPageSizeChange(10);
    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 1,
      PageSize: 10,
    });
  });

  it('should format role names cleanly', () => {
    expect(component.formatRole('AdminEmployee')).toBe('Admin Employee');
    expect(component.formatRole('Supervisor')).toBe('Supervisor');
    expect(component.formatRole(undefined)).toBe('Employee');
  });

  it('should derive username from email when userName field is absent', () => {
    expect(component.getUserName(mockEmployees[0])).toBe('samuel');
    expect(
      component.getUserName({
        ...mockEmployees[0],
        userName: 'customUser',
      })
    ).toBe('customUser');
  });

  it('should render mobile card view for employees', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const cards = compiled.querySelectorAll('.employee-mobile-card');
    expect(cards.length).toBe(2);

    const firstCard = cards[0] as HTMLElement;
    expect(firstCard.textContent).toContain('Samuel John');
    expect(firstCard.textContent).toContain('EMP-0001');
    expect(firstCard.textContent).toContain('Admin Employee');
  });

  it('should append records when loadMoreEmployees is invoked', () => {
    fixture.detectChanges();
    component.totalPages.set(2);
    component.pageNumber.set(1);

    const nextPageData: ApiResponse<AdminEmployeePagedData> = {
      isSuccess: true,
      data: {
        items: [
          {
            id: 'extra-1',
            employeeId: 'EMP-0003',
            employeeName: 'David Miller',
            email: 'david@renew1.in',
            phoneNumber: '9123456789',
            role: 'Employee',
            status: true,
          },
        ],
        pageNumber: 2,
        pageSize: 5,
        totalRecords: 3,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      },
      message: 'OK',
      statusCode: 200,
      errors: null,
    };

    vi.spyOn(employeeService, 'getAllEmployees').mockReturnValue(of(nextPageData));

    component.loadMoreEmployees();

    expect(employeeService.getAllEmployees).toHaveBeenCalledWith({
      Search: '',
      PageNumber: 2,
      PageSize: 5,
    });
    expect(component.employees().length).toBe(3);
    expect(component.employees()[2].employeeName).toBe('David Miller');
  });
});
