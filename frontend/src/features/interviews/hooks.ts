import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DASHBOARD_KEY, INTERVIEWS_KEY, NOTIFICATIONS_KEY } from '@/lib/queryKeys';
import { interviewsApi } from './interviews.api';
import type { InterviewListParams } from './types';

export function useInterviews(params: InterviewListParams, enabled = true) {
  return useQuery({
    queryKey: [...INTERVIEWS_KEY, 'list', params],
    queryFn: () => interviewsApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInterview(id: string | undefined) {
  return useQuery({
    queryKey: [...INTERVIEWS_KEY, 'detail', id],
    queryFn: () => interviewsApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

/** Interviews feed the dashboard, and rescheduling or cancelling one removes its reminders, so both refresh. */
function useInterviewMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [INTERVIEWS_KEY, DASHBOARD_KEY, NOTIFICATIONS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export const useCreateInterview = () => useInterviewMutation(interviewsApi.create);
export const useUpdateInterview = () => useInterviewMutation(interviewsApi.update);
export const useDeleteInterview = () => useInterviewMutation(interviewsApi.remove);
