export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
  password_hash?: string; // Only for internal use, not exposed in API responses
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthError {
  message: string;
  field?: string;
}