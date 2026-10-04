export type EnquiryStatus =
  | 'Created'
  | 'Submitted'
  | 'QuoteInProgress'
  | 'Quoted'
  | 'PaymentVerificationPending'
  | 'PolicyInProgress'
  | 'PolicyIssued'
  | 'Cancelled';

export enum EnquiryStatusEnum {
  Created = 1,
  Submitted = 2,
  QuoteInProgress = 3,
  Quoted = 4,
  PaymentVerificationPending = 5,
  PolicyInProgress = 6,
  PolicyIssued = 7,
  Cancelled = 8,
}

export interface StatusOption {
  id: number;
  key: EnquiryStatus;
  label: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 1, key: 'Created', label: 'Created' },
  { id: 2, key: 'Submitted', label: 'Submitted' },
  { id: 3, key: 'QuoteInProgress', label: 'Quote In Progress' },
  { id: 4, key: 'Quoted', label: 'Quoted' },
  { id: 5, key: 'PaymentVerificationPending', label: 'Payment Verification Pending' },
  { id: 6, key: 'PolicyInProgress', label: 'Policy In Progress' },
  { id: 7, key: 'PolicyIssued', label: 'Policy Issued' },
  { id: 8, key: 'Cancelled', label: 'Cancelled' },
];

export type UserRole = 'Agent' | 'Staff';

export interface InsuranceTypeItem {
  id: string;
  name: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface VehicleTypeItem {
  id: string;
  typeName: string;
  description?: string;
  isActive: boolean;
}

export interface EnquiryItem {
  id?: string;
  enquiryId: string;
  enquiryNumber?: string;
  customerName: string;
  phoneNumber?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleNumber?: string;
  insuranceTypeId?: string;
  insuranceType: string;
  policyType?: string;
  vehicleTypeId?: string;
  vehicleType?: string;
  status: EnquiryStatus;
  coverageAmount?: string;
  premiumEstimated?: string;
  agentId?: string;
  agentName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedStaff?: string;
  assignedStaffRole?: 'Agent' | 'Staff';
  assigedAgentNumber?: string;
  assignedAgentNumber?: string;
  createdAgent?: string;
  createdAgentName?: string;
  createdAgentNumber?: string;
  createdByName?: string;
  createdByNumber?: string;
  createdAgentAndNumber?: string;
  agencyName?: string;
  engineNumber?: string;
  chassisNumber?: string;
  chasisNumber?: string;
  createdAt: string;
  lastUpdated?: string;
  notes?: string;
}

export type EnquiryRecord = EnquiryItem;

export interface EnquiryMetrics {
  allEnquiries: number;
  created: number;
  submitted: number;
  quoted: number;
  policyIssued: number;
  pointsEarned: number;
}

export interface EnquiryPagedResult {
  items: EnquiryItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface EnquiryDataResponse {
  metrics: EnquiryMetrics;
  enquiries: EnquiryPagedResult;
}

export interface EnquiryFilterParams {
  search?: string;
  insuranceTypeId?: string;
  vehicleTypeId?: string;
  enquiryStatus?: string;
  agentId?: string;
  dateFilter?: number;
  fromDate?: string;
  toDate?: string;
  sortDirection?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateVehicleEnquiryPayload {
  insuranceTypeId: string;
  vehicleTypeId: string;
  customerName: string;
  customerNumber: string;
  vehicleNumber: string;
  miPolicyType: string;
  isRCOwnerChanged: boolean;
  hasPreviousClaim: boolean;
  ncbPercentage: number;
  priority: number;
  submissionMode: number;
}

export interface VehicleEnquiryResponseData {
  enquiryId?: string;
  brand?: string;
  model?: string;
  manufactureYear?: string;
  cubicCapacity?: string;
  fuelType?: string;
  submissionType?: string;
  currentStep?: string | null;
  selectedQuotedId?: string | null;
  engineNumber?: string;
  chassisNumber?: string;
  customerName?: string;
  customerNumber?: string;
  vehicleNumber?: string;
  miPolicyType?: string;
  isRCOwnerChanged?: boolean;
  hasPreviousClaim?: boolean;
  ncbPercentage?: number;
  priority?: number;
  submissionMode?: number;
}

export type DocumentType = 'RC' | 'Identity' | 'PreviousPolicy' | 'VehicleImage' | 'PaymentScreenshot' | (string & {});
export type DocumentSide = 'Front' | 'Back' | (string & {});

export interface UploadDocPayload {
  enquiryId: string;
  docType: DocumentType;
  docSide: DocumentSide;
  file: File;
}

export interface UploadedDocItem {
  id?: string;
  docType: DocumentType;
  docSide: DocumentSide;
  fileName: string;
  fileSize: number;
  fileType: string;
  previewUrl?: string;
  uploadedAt: string;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export interface SubmitVehicleEnquiryPayload {
  enquiryId: string;
}

export interface SubmitVehicleEnquiryResponseData {
  enquiryId: string;
  status: string;
  redirectToQuotes: boolean;
}

export interface AgentEnquiryDocument {
  id: string;
  docType?: DocumentType | string;
  docSide?: DocumentSide | string;
  docName?: string;
  uploadedAt?: string;
  url: string;
}

export interface AgentEnquiryAssignmentHistoryItem {
  id: string;
  changedByUserId?: string;
  changedByUserName?: string;
  fromStatus?: string;
  toStatus?: string;
  fromEmployeeId?: string | null;
  fromEmployeeName?: string | null;
  toEmployeeId?: string | null;
  toEmployeeName?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export interface AgentEnquiryDetailsData {
  enquiryId: string;
  enquiryNumber: string;
  customerName: string;
  phoneNumber?: string;
  vehicleNumber?: string;
  engineNumber?: string;
  chassisNumber?: string;
  insuranceTypeId?: string;
  insuranceType: string;
  policyType?: string;
  vehicleTypeId?: string;
  vehicleType?: string;
  status: string;
  agentId?: string;
  agentName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentNumber?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  documents?: AgentEnquiryDocument[];
  assignmentHistory?: AgentEnquiryAssignmentHistoryItem[];
  hasQuote?: boolean;
  hasPolicy?: boolean;
}

export interface VehicleDocumentApiItem {
  id: string;
  fileName: string;
  docType: DocumentType | string;
  docSide: DocumentSide | string;
  uploadedUserIpAddress?: string;
  uploadedUserName?: string | null;
  url: string;
}

export interface QuoteItem {
  id: string;
  insuranceCompanyName: string;
  idv: number | null;
  premium: number;
  agentPoints: number;
  remarks: string | null;
  quoteDate: string;
  isSelected: boolean;
}

export interface QuoteFilterParams {
  enquiryId: string;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface QuotePagedResult {
  items: QuoteItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type PaymentMethod = 'Ledger' | 'BankTransaction';

export interface BankPaymentSubmission {
  enquiryId: string;
  quoteId: string;
  amount: number;
  transactionId: string;
  utrNumber: string;
  remark?: string;
  submittedAt: string;
  paymentMethod: 'BankTransaction';
}

export interface LedgerPaymentSubmission {
  enquiryId: string;
  quoteId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  submittedAt: string;
  paymentMethod: 'Ledger';
}

export interface PolicySummaryData {
  enquiryId: string;
  customerName: string;
  mobile: string;
  address: string;
  vehicleNumber: string;
  vehicle: string;
  vehicleType: string;
  fuelType: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  companyPayable: number | null;
  adminProfit: number | null;
  agentPayable: number;
  agentProfit: number;
  selectedQuoteId?: string;
}

export interface SubmitPolicyRequestPayload {
  quoteId: string;
  enquiryId: string;
  useLedger: boolean;
  transactionId?: string | null;
  bankAccountId?: string | null;
  remarks?: string | null;
  paymentScreenshotUrl?: string | null;
}

export interface LedgerPaymentDetailsData {
  ledgerBalance: number;
  finalAmount: number;
  balanceAfterCut: number;
}

export interface PolicyQrDetailsData {
  qrMasterId: string;
  qrName: string;
  qrImageUrl: string;
  bankAccountId: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}



export interface QuotePaymentSummaryData {
  enquiryId: string;
  paymentMode: 'Ledger' | 'Bank' | 'BankTransaction' | string;
  amount: number;
  remarks?: string | null;
  agentLedgerName?: string | null;
  agentTotalLimit?: number | null;
  currentBalance?: number | null;
  referenceNumber?: string | null;
  transactionId?: string | null;
  ledgerPaymentTime?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  accountName?: string | null;
  upiId?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  paymentDate?: string | null;
}

export interface PolicyPreviewData {
  enquiryNumber: string;
  insuredCompanyName: string;
  policyNumber: string;
  policyStartDate: string;
  policyEndDate: string;
  policyUrl: string;
  policyIssuedBy: string;
  policyIssuedByPhone: string;
}
