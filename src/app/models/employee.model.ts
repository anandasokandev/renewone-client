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

