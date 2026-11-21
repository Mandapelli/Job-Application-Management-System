import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATIONS_KEY } from '@/lib/queryKeys';
import { notificationsApi } from './notifications.api';
import type { NotificationListParams } from './types';

export function useNotifications(params: NotificationListParams) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', params],
    queryFn: () => notificationsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Powers the bell badge. The server creates reminders every minute, so this checks again once a minute. */
export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

function useNotificationMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export const useSetRead = () => useNotificationMutation(notificationsApi.setRead);
export const useMarkAllRead = () => useNotificationMutation(notificationsApi.markAllRead);
export const useDeleteNotification = () => useNotificationMutation(notificationsApi.remove);
