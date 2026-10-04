export interface LoginRequest {
  userName: string;
  password: string;
}

export interface UserData {
  userId: string;
  token: string;
  fullName: string;
  userType: string;
  accountId: string;
}