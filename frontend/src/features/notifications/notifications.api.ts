import { api } from '@/lib/api';
import type { ApiSuccess } from '@/types/api';
import type { AppNotification, NotificationListParams } from './types';

export const notificationsApi = {
  list: async (params: NotificationListParams) => {
    const res = await api.get<ApiSuccess<AppNotification[]>>('/notifications', { params });
    return { items: res.data.data, meta: res.data.meta! };
  },
  unreadCount: async () =>
    (await api.get<ApiSuccess<{ count: number }>>('/notifications/unread-count')).data.data.count,
  setRead: async ({ id, read }: { id: string; read: boolean }) =>
    (await api.patch<ApiSuccess<AppNotification>>(`/notifications/${id}`, { read })).data.data,
  markAllRead: async () =>
    (await api.post<ApiSuccess<{ updated: number }>>('/notifications/read-all')).data.data.updated,
  remove: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
