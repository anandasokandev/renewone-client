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
  ledgerTotalCredited?: number;
  ledgerTotalDebited?: number;
  ledgerTransactionCount?: number;
  ledgerDerivedBalance?: number;
  balanceVariance?: number;
  isPrimary: boolean;
  isActive: boolean;
}

export interface BankAccountFilterParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface BankTransactionFilterParams {
  bankAccountId: string;
  search?: string;
  transactionType?: 'Credit' | 'Debit';
  category?: string;
  userId?: string;
  vendorId?: string;
  policyPaymentId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  pageNumber?: number;
  pageSize?: number;
}

export interface BankTransactionItem {
  id: string;
  bankAccountId: string;
  bankName: string;
  accountNumberMasked: string;
  transactionType: 'Credit' | 'Debit' | string;
  amount: number;
  category: string;
  description: string;
  policyPaymentId?: string | null;
  salaryId?: string | null;
  vendorId?: string | null;
  userId?: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface BankTransactionSummary {
  totalCredited: number;
  totalDebited: number;
  netCashFlow: number;
  totalTransactions: number;
}

export interface BankTransactionResponse {
  summary: BankTransactionSummary;
  transactions: PagedBankTransactions;
}

export interface PagedBankTransactions {
  items: BankTransactionItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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

export interface UpdateBankAccountRequest {
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

