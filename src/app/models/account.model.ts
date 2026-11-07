export interface UserProfileData {
  userId: string;
  accountId: string;
  profileUrl: string | null;
  fullName: string;
  agencyName: string;
  userName: string;
  email: string;
  phone: string;
  address: string | null;
  pincode: string | null;
}

export interface UpdateUserProfilePayload {
  userId: string;
  accountId?: string;
  profileUrl?: string | null;
  fullName?: string;
  agencyName?: string;
  userName: string;
  email: string;
  phone: string;
  address?: string | null;
  pincode?: string | null;
}

export interface RegisterAgentPayload {
  agentName: string;
  userName: string;
  address?: string;
  pincode?: string;
  contactNumber: string;
  email: string;
  password: string;
}

export interface AgentSummary {
  activeAgents: number;
  pendingApprovals: number;
}

export interface AgentListItem {
  accountId: string;
  agentId: string;
  agentName: string;
  agencyName: string;
  email: string;
  phoneNumber: string;
  address: string | null;
  pincode: string | null;
  isApproved: boolean | null;
  status: string;
  joinedOn: string;
}

export interface AgentsResponseData {
  summary: AgentSummary;
  agents: {
    items: AgentListItem[];
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface AgentFilterParams {
  sortBy?: string;
  sortOrder?: 'Asc' | 'Desc';
  pageNumber?: number;
  pageSize?: number;
  userType?: string;
  search?: string;
  status?: string;
}

export interface AgentAdminDetails {
  accountId: string;
  agentCode: string;
  agentName: string;
  agencyName: string;
  phoneNumber: string;
  email: string;
  joinedDate: string;
  address?: string | null;
  pincode?: string | null;
  isActive: boolean;
  agentClassName?: string | null;
}

export interface AgentDashboardOverview {
  businessSummary: { totalEnquiries: number; growthPercentage: number; policiesCompleted: number; quoteInProgress: number; policyInProgress: number };
  revenueSummary: { monthlySales: number; lifetimeSales: number; monthlyProfit: number; lifetimeProfit: number; companyPayable: number; commissionEarned: number };
  financialOverview?: { walletBalance: number; manualWalletBalance: number; lastRechargeAmount: number; lastRechargeDate?: string | null };
  recentEnquiries: Array<{ id: string; customerName: string; insuranceType: string; status: string; premium: number }>;
  recentPolicies: Array<{ policyId: string; policyNo: string; customerName: string; insurerName: string; premium: number }>;
}

export interface AgentStaffPerformanceData {
  totalStaff: number; activeStaff: number; inactiveStaff: number; matureEnquiries: number; issuedWithin30Days: number; conversionRate: number; cohortCutoffUtc: string;
  staff: Array<{ staffId: string; fullName: string; userName: string; isActive: boolean; createdAt: string; assignedEnquiries: number; matureEnquiries: number; issuedWithin30Days: number; conversionRate: number }>;
}
export interface AgentFinanceData {
  wallet: { id: string; balance: number; updatedAt: string | null } | null;
  manualWallet: { id: string; balance: number; updatedAt: string | null } | null;
  walletTransactions: Array<{ id: string; type: string; amount: number; balanceBefore: number; balanceAfter: number; remarks: string | null; referenceNo: string | null; status: string; createdAt: string }>;
  manualWalletTransactions: Array<{ id: string; transactionType: string; amount: number; balanceBefore: number; balanceAfter: number; remarks: string | null; referenceNo: string | null; createdAt: string }>;
}
export interface AgentActivityData {
  enquiries: Array<{ id: string; type: string; title: string; status: string; occurredAt: string; reference: string | null }>;
  policies: Array<{ id: string; type: string; title: string; status: string; occurredAt: string; reference: string }>;
}
export interface AgentProfitPeriodSnapshot {
  adminProfit: number;
  agentEarnings: number;
  premiumVolume: number;
  policiesIssued: number;
  adminProfitChangePercentage: number | null;
  agentEarningsChangePercentage: number | null;
}
export interface AgentProfitabilityData {
  today: AgentProfitPeriodSnapshot;
  thisWeek: AgentProfitPeriodSnapshot;
  thisYear: AgentProfitPeriodSnapshot;
}
export interface UpdateAgentAdminDetailsRequest {
  agentName: string;
  email: string;
  phoneNumber: string;
  address: string | null;
  pincode: string | null;
}
export interface GeneratedPasswordResetData {
  accountId: string;
  userId: string;
  userName: string;
  userType: string;
  generatedPassword: string;
  resetAt: string;
}

