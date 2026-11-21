import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Interview, InterviewListParams, InterviewPayload } from './types';

export const interviewsApi = {
  list: async (params: InterviewListParams) => {
    const res = await api.get<ApiSuccess<Interview[]>>('/interviews', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  get: async (id: string) => (await api.get<ApiSuccess<Interview>>(`/interviews/${id}`)).data.data,
  create: async (payload: InterviewPayload) =>
    (await api.post<ApiSuccess<Interview>>('/interviews', payload)).data.data,
  update: async ({ id, payload }: { id: string; payload: Partial<InterviewPayload> }) =>
    (await api.patch<ApiSuccess<Interview>>(`/interviews/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/interviews/${id}`);
  },
};
