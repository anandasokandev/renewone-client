export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UpiMasterItem {
  id: string;
  bankAccountId: string;
  bankAccount: string;
  upiId: string;
  upiName: string;
  isActive: boolean;
}

export interface QrMappingItem {
  id: string;
  qrMasterId: string;
  qrName: string;
  insuranceTypeId: string;
  insuranceType: string;
  vehicleTypeId: string;
  vehicleType: string;
  bankName: string;
  isActive: boolean;
}

export interface QrFilterParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateUpiMasterRequest {
  upiId: string;
  upiName: string;
  bankAccountId: string;
}

export interface UpdateUpiMasterRequest extends CreateUpiMasterRequest {
  id: string;
  isActive: boolean;
}

export interface BankAccountItem {
  id: string;
  accountName: string;
  bankName: string;
  branchName?: string;
  accountHolderName?: string;
  accountNumber: string;
  ifscCode?: string;
  upiId?: string;
  openingBalance?: number;
  currentBalance?: number;
  isPrimary?: boolean;
  isActive: boolean;
}

export interface CreateQrMappingRequest {
  qrMasterId: string;
  insuranceTypeId: string;
  vehicleTypeId: string;
}

export interface UpdateQrMappingRequest extends CreateQrMappingRequest {
  id: string;
  isActive: boolean;
}

