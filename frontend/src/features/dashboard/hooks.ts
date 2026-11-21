import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DASHBOARD_KEY } from '@/lib/queryKeys';
import type { ApiSuccess } from '@/types/api';
import type { DashboardSummary } from './types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, 'summary'],
    queryFn: async () => (await api.get<ApiSuccess<DashboardSummary>>('/dashboard/summary')).data.data,
    staleTime: 30_000,
  });
}
