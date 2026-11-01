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

