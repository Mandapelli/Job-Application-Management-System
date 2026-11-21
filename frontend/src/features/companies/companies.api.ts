import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { Company, CompanyListParams, CompanyPayload } from './types';

export const companiesApi = {
  list: async (params: CompanyListParams) => {
    const res = await api.get<ApiSuccess<Company[]>>('/companies', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  get: async (id: string) => (await api.get<ApiSuccess<Company>>(`/companies/${id}`)).data.data,
  create: async (payload: CompanyPayload) =>
    (await api.post<ApiSuccess<Company>>('/companies', payload)).data.data,
  update: async ({ id, payload }: { id: string; payload: Partial<CompanyPayload> }) =>
    (await api.patch<ApiSuccess<Company>>(`/companies/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/companies/${id}`);
  },
};
