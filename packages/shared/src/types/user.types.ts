export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  storageQuotaBytes?: number;
  storageUsedBytes?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
}

