import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Employees } from './employees';
import { StaffService } from '../../services/staff/staff.service';

describe('Employees', () => {
  let component: Employees;
  let fixture: ComponentFixture<Employees>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Employees],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Employees);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly bind nested staff data and total/active/inactive metrics', () => {
    const mockResponse = {
      isSuccess: true,
      data: {
        staff: {
          items: [
            {
              id: '4a80773c-6e1d-43a4-8870-5b0a01ec7b90',
              userName: 'kirannair99',
              fullName: 'Kiran Nair',
              email: 'kiran@gmail.com',
              phoneNumber: '7510545454',
              isActive: true,
              createdAt: '2026-09-12T08:31:17.9786645',
            },
            {
              id: 'fce4e05d-f58e-42f6-9350-e8ddbc1ef7f1',
              userName: 'rahul',
              fullName: 'Rahul',
              email: 'rahul@gmail.com',
              phoneNumber: '9744510308',
              isActive: false,
              createdAt: '2026-06-25T10:59:44.1007181',
            },
            {
              id: '793b3b3e-9fed-4724-bfd2-cd80d997d78a',
              userName: 'anand',
              fullName: 'Anand Asokan',
              email: 'ianandasokan@gmail.com',
              phoneNumber: '9744510308',
              isActive: true,
              createdAt: '2026-06-22T09:46:18.8375052',
            },
          ],
          pageNumber: 1,
          pageSize: 4,
          totalRecords: 3,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        totalStaff: 3,
        activeStaff: 2,
        inactiveStaff: 1,
      },
      message: 'Staff fetched successfully',
      statusCode: 200,
      errors: null,
    };

    const staffService = TestBed.inject(StaffService);
    vi.spyOn(staffService, 'getStaffList').mockReturnValue(of(mockResponse as any));

    component.fetchStaff();

    expect(component.staffItems().length).toBe(3);
    expect(component.staffItems()[0].fullName).toBe('Kiran Nair');
    expect(component.totalRecords()).toBe(3);
    expect(component.allStaffCount()).toBe(3);
    expect(component.activeCount()).toBe(2);
    expect(component.inactiveCount()).toBe(1);
    expect(component.pageNumber()).toBe(1);
    expect(component.pageSize()).toBe(4);
  });

  it('should call staffService.toggleStaffStatus with accountId and staff id', () => {
    const staffService = TestBed.inject(StaffService);
    const toggleSpy = vi.spyOn(staffService, 'toggleStaffStatus').mockReturnValue(
      of({ isSuccess: true, message: 'Status updated' } as any)
    );
    const fetchSpy = vi.spyOn(component, 'fetchStaff');

    const testStaff = {
      id: 'staff-123',
      userName: 'john',
      fullName: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '1234567890',
      isActive: true,
      createdAt: '2026-01-01',
    };

    component.onToggleStatus(testStaff);

    expect(toggleSpy).toHaveBeenCalledWith(component.getAccountId(), 'staff-123');
    expect(fetchSpy).toHaveBeenCalled();
  });
});
