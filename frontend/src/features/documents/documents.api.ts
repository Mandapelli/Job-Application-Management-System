import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { DocumentItem, DocumentListParams, DocumentType, UploadInput } from './types';

export const documentsApi = {
  list: async (params: DocumentListParams) => {
    const res = await api.get<ApiSuccess<DocumentItem[]>>('/documents', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  get: async (id: string) => (await api.get<ApiSuccess<DocumentItem>>(`/documents/${id}`)).data.data,

  upload: async ({ file, name, type, description }: UploadInput) => {
    const form = new FormData();
    form.append('type', type);
    if (name.trim()) form.append('name', name.trim());
    if (description.trim()) form.append('description', description.trim());
    form.append('file', file); // the file goes last so the other fields are read first
    // A 5 MB upload on a slow connection can take longer than the default 15 s.
    return (await api.post<ApiSuccess<DocumentItem>>('/documents', form, { timeout: 120_000 })).data.data;
  },

  update: async ({ id, payload }: { id: string; payload: Partial<{ name: string; type: DocumentType; description: string | null }> }) =>
    (await api.patch<ApiSuccess<DocumentItem>>(`/documents/${id}`, payload)).data.data,
  remove: async (id: string) => {
    await api.delete(`/documents/${id}`);
  },

  attach: async ({ id, applicationId }: { id: string; applicationId: string }) =>
    (await api.post<ApiSuccess<DocumentItem>>(`/documents/${id}/applications`, { applicationId })).data.data,
  detach: async ({ id, applicationId }: { id: string; applicationId: string }) =>
    (await api.delete<ApiSuccess<DocumentItem>>(`/documents/${id}/applications/${applicationId}`)).data.data,

  /** Downloads need the login token, so the file is fetched with Axios and then saved from memory. */
  download: async (id: string, fileName: string) => {
    const res = await api.get<Blob>(`/documents/${id}/download`, { responseType: 'blob', timeout: 120_000 });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
