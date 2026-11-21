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

export const authApi = {
  register: async (input: RegisterInput) =>
    (await api.post<ApiSuccess<AuthResult>>('/auth/register', input)).data.data,
  login: async (input: LoginInput) =>
    (await api.post<ApiSuccess<AuthResult>>('/auth/login', input)).data.data,
  me: async () => (await api.get<ApiSuccess<{ user: User }>>('/auth/me')).data.data.user,
  logout: async () => {
    await api.post('/auth/logout');
  },
};
