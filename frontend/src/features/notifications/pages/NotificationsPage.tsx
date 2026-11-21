import { CheckCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { NotificationItem } from '../components/NotificationItem';
import { UnreadBadge } from '../components/UnreadBadge';
import { useMarkAllRead, useNotifications, useUnreadCount } from '../hooks';

export function NotificationsPage() {
  const [sp, setSp] = useSearchParams();
  const onlyUnread = sp.get('filter') === 'unread';
  const page = useMemo(() => {
    const n = Number(sp.get('page'));
    return Number.isInteger(n) && n > 0 ? n : 1;
  }, [sp]);

  const query = useNotifications({ page, limit: 15, unread: onlyUnread ? true : undefined });
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();

  const go = (changes: Record<string, string | undefined>) =>
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const onMarkAll = async () => {
    try {
      const updated = await markAll.mutateAsync();
      toast.success(updated > 0 ? `Marked ${updated} notification(s) as read` : 'Nothing to mark');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not mark notifications as read'));
    }
  };

  const tabs = [
    { value: undefined, label: 'All' },
    { value: 'unread', label: 'Unread' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Reminders for upcoming interviews and tasks that are due.</p>
        </div>
        <Button variant="outline" onClick={() => void onMarkAll()} disabled={markAll.isPending || !unread.data}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Show notifications">
            {tabs.map((t) => (
              <button
                key={t.label}
                type="button"
                aria-pressed={onlyUnread === (t.value === 'unread')}
                onClick={() => go({ filter: t.value })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  onlyUnread === (t.value === 'unread')
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {t.value === 'unread' && <UnreadBadge count={unread.data} />}
              </button>
            ))}
          </div>
        </div>

        {query.isPending ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title={onlyUnread ? "You're all caught up" : 'No notifications yet'}
            description={
              onlyUnread
                ? 'There is nothing unread.'
                : 'Reminders appear here when an interview is within 24 hours, or a task is due soon or overdue.'
            }
            action={
              onlyUnread ? (
                <Button variant="outline" onClick={() => go({ filter: undefined })}>
                  Show all
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className={cn('divide-y transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              {query.data.items.map((n) => (
                <NotificationItem key={n.id} n={n} />
              ))}
            </ul>
            <Pagination
              meta={query.data.meta}
              disabled={query.isPlaceholderData}
              onPageChange={(p) => go({ page: String(p) })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
