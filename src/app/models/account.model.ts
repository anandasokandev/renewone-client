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

