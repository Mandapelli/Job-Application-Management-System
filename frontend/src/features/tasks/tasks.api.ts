import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Task, TaskListParams, TaskPayload, TaskSummary } from './types';

export const tasksApi = {
  list: async (params: TaskListParams) => {
    const res = await api.get<ApiSuccess<Task[]>>('/tasks', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  summary: async () => (await api.get<ApiSuccess<TaskSummary>>('/tasks/summary')).data.data,
  get: async (id: string) => (await api.get<ApiSuccess<Task>>(`/tasks/${id}`)).data.data,
  create: async (payload: TaskPayload) => (await api.post<ApiSuccess<Task>>('/tasks', payload)).data.data,
  update: async ({ id, payload }: { id: string; payload: Partial<TaskPayload> }) =>
    (await api.patch<ApiSuccess<Task>>(`/tasks/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/tasks/${id}`);
  },
};
