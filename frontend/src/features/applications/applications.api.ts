import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Application, ApplicationPayload, ApplicationStatus, ListParams } from './types';

export const applicationsApi = {
  list: async (params: ListParams) => {
    const res = await api.get<ApiSuccess<Application[]>>('/applications', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  get: async (id: string) => (await api.get<ApiSuccess<Application>>(`/applications/${id}`)).data.data,
  create: async (payload: ApplicationPayload) =>
    (await api.post<ApiSuccess<Application>>('/applications', payload)).data.data,
  update: async ({ id, payload }: { id: string; payload: Partial<ApplicationPayload> }) =>
    (await api.patch<ApiSuccess<Application>>(`/applications/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/applications/${id}`);
  },
  changeStatus: async ({ id, status }: { id: string; status: ApplicationStatus }) =>
    (await api.patch<ApiSuccess<Application>>(`/applications/${id}/status`, { status })).data.data,
};
