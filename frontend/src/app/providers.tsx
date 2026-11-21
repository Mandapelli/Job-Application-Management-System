import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ThemeProvider, useTheme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/** Toasts follow the current theme. */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} richColors closeButton position="top-right" />;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <ThemedToaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
