export interface LoginRequest {
  userName: string;
  password: string;
}

export interface UserData {
  userId: string;
  token: string;
  fullName: string;
  userType: string;
  accountId: string | null;
}

export const ADMIN_USER_TYPES = ['SuperAdmin', 'Supervisor', 'AdminEmployee'] as const;
export type AdminUserType = (typeof ADMIN_USER_TYPES)[number];
