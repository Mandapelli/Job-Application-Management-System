import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthResult {
  user: User;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
}
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export const authApi = {
  register: async (input: RegisterInput) =>
    (await api.post<ApiSuccess<AuthResult>>('/auth/register', input)).data.data,
  login: async (input: LoginInput) =>
    (await api.post<ApiSuccess<AuthResult>>('/auth/login', input)).data.data,
  me: async () => (await api.get<ApiSuccess<{ user: User }>>('/auth/me')).data.data.user,
  logout: async () => {
    await api.post('/auth/logout');
  },

  /** Returns a fresh token: the old one (and every other device's) stops working. */
  changePassword: async (input: ChangePasswordInput) =>
    (await api.post<ApiSuccess<AuthResult>>('/auth/change-password', input)).data.data,
  /** Always succeeds, whether or not the email has an account. */
  forgotPassword: async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  },
  resetPassword: async (input: ResetPasswordInput) => {
    await api.post('/auth/reset-password', input);
  },
};
