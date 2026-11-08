export interface AdminEmployeeItem {
  id: string;
  employeeId: string;
  employeeName: string;
  userName?: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: boolean;
  activeTask?: number;
  completedTask?: number;
  createdOn?: string;
}

export interface AdminEmployeePagedData {
  items: AdminEmployeeItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetAllEmployeesPayload {
  Search: string;
  PageNumber: number;
  PageSize: number;
}

export interface WorkAllocationPayload {
  InsuranceTypeId: string;
  VehicleTypeIds: string[];
}

export interface CreateInternalUserPayload {
  UserName: string;
  FullName: string;
  Email: string;
  PhoneNumber: string;
  Password: string;
  UserType: string;
  WorkAllocations: WorkAllocationPayload[];
  ModulePermissions: string[];
}

export interface UpdateEmployeePayload {
  UserId: string;
  FullName: string;
  Email: string;
  PhoneNumber: string;
}

export interface EmployeeWorkAllocation {
  insuranceTypeId: string;
  vehicleTypeIds: string[];
}

export interface EmployeeRights {
  userId: string;
  fullName: string;
  userType: string;
  workAllocations: EmployeeWorkAllocation[];
  modulePermissions: string[];
}

export interface UpdateEmployeeRightsPayload {
  UserId: string;
  WorkAllocations: WorkAllocationPayload[];
  ModulePermissions: string[];
}

