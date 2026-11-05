export interface BankAccountItem {
  id: string;
  accountName: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  openingBalance: number;
  currentBalance: number;
  isPrimary: boolean;
  isActive: boolean;
}

export interface BankAccountFilterParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateBankAccountRequest {
  accountName: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  accountHolderName: string;
  isPrimary: boolean;
  isActive: boolean;
}

