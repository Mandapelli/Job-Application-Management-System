import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DASHBOARD_KEY, NOTIFICATIONS_KEY, TASKS_KEY } from '@/lib/queryKeys';
import { tasksApi } from './tasks.api';
import type { TaskListParams } from './types';

export function useTasks(params: TaskListParams) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'list', params],
    queryFn: () => tasksApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTaskSummary() {
  return useQuery({ queryKey: [...TASKS_KEY, 'summary'], queryFn: tasksApi.summary });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'detail', id],
    queryFn: () => tasksApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

/** Tasks feed the dashboard's counts and "tasks to do" list, so it is refreshed as well. */
function useTaskMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [TASKS_KEY, DASHBOARD_KEY, NOTIFICATIONS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export const useCreateTask = () => useTaskMutation(tasksApi.create);
export const useUpdateTask = () => useTaskMutation(tasksApi.update);
export const useDeleteTask = () => useTaskMutation(tasksApi.remove);
