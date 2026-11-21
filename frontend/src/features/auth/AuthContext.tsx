import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { tokenStore } from '@/lib/authToken';
import { authApi, type LoginInput, type RegisterInput, type User } from './auth.api';

interface AuthContextValue {
  user: User | undefined;
  isAuthenticated: boolean;
  /** True while a stored token is being verified with the server. */
  isLoading: boolean;
  /** True when verifying failed for a reason other than an invalid token (e.g. server down). */
  isError: boolean;
  retry: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ME_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // The token lives in localStorage; this re-renders whenever it is set or cleared (including by the 401 interceptor).
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me,
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  const startSession = useCallback(
    (result: { user: User; token: string }) => {
      queryClient.setQueryData(ME_KEY, result.user);
      tokenStore.set(result.token);
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginInput) => startSession(await authApi.login(input)),
    [startSession],
  );
  const register = useCallback(
    async (input: RegisterInput) => startSession(await authApi.register(input)),
    [startSession],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined); // best effort; the token is discarded either way
    tokenStore.clear();
    queryClient.clear(); // never leak one user's cached data to the next
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? me.data : undefined,
      isAuthenticated: !!token && !!me.data,
      isLoading: !!token && me.isPending,
      isError: !!token && me.isError,
      retry: () => void me.refetch(),
      login,
      register,
      logout,
    }),
    [token, me, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
