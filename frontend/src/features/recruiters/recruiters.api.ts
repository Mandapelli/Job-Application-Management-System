import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Recruiter, RecruiterListParams, RecruiterPayload } from './types';

export const recruitersApi = {
  list: async (params: RecruiterListParams) => {
    const res = await api.get<ApiSuccess<Recruiter[]>>('/recruiters', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  get: async (id: string) => (await api.get<ApiSuccess<Recruiter>>(`/recruiters/${id}`)).data.data,
  create: async (payload: RecruiterPayload) =>
    (await api.post<ApiSuccess<Recruiter>>('/recruiters', payload)).data.data,
  update: async ({ id, payload }: { id: string; payload: Partial<RecruiterPayload> }) =>
    (await api.patch<ApiSuccess<Recruiter>>(`/recruiters/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/recruiters/${id}`);
  },
};
