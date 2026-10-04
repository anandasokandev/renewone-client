export interface StaffItem {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: string;
}

export interface StaffPagedResult {
  items: StaffItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface StaffResponseData {
  staff?: StaffPagedResult;
  totalStaff?: number;
  activeStaff?: number;
  inactiveStaff?: number;
  items?: StaffItem[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface CreateStaffRequest {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  accountId: string;
}

export interface StaffFilterParams {
  search?: string;
  status?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}
