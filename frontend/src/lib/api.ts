import axios from 'axios';
import { tokenStore } from '@/lib/authToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 15_000,
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 from any normal endpoint means the token is missing/expired: clear it,
// and the auth state change sends the user back to the login page.
// Login/register 401s are just "wrong password", so they are left alone.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isCredentialCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isCredentialCall) {
      tokenStore.clear();
    }
    return Promise.reject(error);
  },
);
