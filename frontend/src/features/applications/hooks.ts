import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { applicationsApi } from './applications.api';
import type { ApplicationStatus, ListParams } from './types';

import {
  APPLICATIONS_KEY,
  COMPANIES_KEY,
  DASHBOARD_KEY,
  DOCUMENTS_KEY,
  INTERVIEWS_KEY,
  NOTIFICATIONS_KEY,
  RECRUITERS_KEY,
  TASKS_KEY,
} from '@/lib/queryKeys';

export { APPLICATIONS_KEY };

export function useApplications(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, 'list', params],
    queryFn: () => applicationsApi.list(params),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
    enabled,
  });
}

export type KanbanFilters = Pick<
  ListParams,
  'search' | 'location' | 'workMode' | 'employmentType' | 'sortBy' | 'sortOrder'
>;
export const KANBAN_PAGE_SIZE = 20;

/** One column of the board: its own paginated query for a single status ("Load more" fetches the next page). */
export function useKanbanColumn(status: ApplicationStatus, filters: KanbanFilters) {
  return useInfiniteQuery({
    queryKey: [...APPLICATIONS_KEY, 'kanban', status, filters],
    queryFn: ({ pageParam }) =>
      applicationsApi.list({ ...filters, status, page: pageParam, limit: KANBAN_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, 'detail', id],
    queryFn: () => applicationsApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) => (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

/**
 * Builds a mutation hook that refreshes applications on success. Companies and recruiters show
 * application counts/lists, so they are refreshed too.
 */
function useInvalidatingMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [
          APPLICATIONS_KEY,
          COMPANIES_KEY,
          RECRUITERS_KEY,
          INTERVIEWS_KEY,
          TASKS_KEY,
          DOCUMENTS_KEY,
          NOTIFICATIONS_KEY,
          DASHBOARD_KEY,
        ].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const useCreateApplication = () => useInvalidatingMutation(applicationsApi.create);
export const useUpdateApplication = () => useInvalidatingMutation(applicationsApi.update);
export const useDeleteApplication = () => useInvalidatingMutation(applicationsApi.remove);
export const useChangeStatus = () => useInvalidatingMutation(applicationsApi.changeStatus);
