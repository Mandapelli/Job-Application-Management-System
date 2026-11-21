import { AlertCircle, CalendarClock, ListTodo, Mail, MailOpen, Trash2, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/apiError';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDeleteNotification, useSetRead } from '../hooks';
import type { AppNotification, NotificationType } from '../types';

const ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  INTERVIEW_REMINDER: { icon: CalendarClock, className: 'bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300' },
  TASK_DUE: { icon: ListTodo, className: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' },
  TASK_OVERDUE: { icon: AlertCircle, className: 'bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-300' },
};

const EVENT_LABEL: Record<NotificationType, string> = {
  INTERVIEW_REMINDER: 'Interview',
  TASK_DUE: 'Due',
  TASK_OVERDUE: 'Was due',
};

export function NotificationItem({ n }: { n: AppNotification }) {
  const navigate = useNavigate();
  const setRead = useSetRead();
  const remove = useDeleteNotification();
  const unread = n.readAt === null;
  const { icon: Icon, className } = ICONS[n.type];

  const open = () => {
    if (unread) setRead.mutate({ id: n.id, read: true }); // reading it is implied by opening it
    if (n.link) navigate(n.link);
  };

  const toggle = async () => {
    try {
      await setRead.mutateAsync({ id: n.id, read: unread });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the notification'));
    }
  };

  const onDelete = async () => {
    try {
      await remove.mutateAsync(n.id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the notification'));
    }
  };

  return (
    <li className={cn('flex items-start gap-3 p-4', unread && 'bg-primary/5')}>
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', className)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <button type="button" onClick={open} className="min-w-0 flex-1 text-left" disabled={!n.link && !unread}>
        <p className="flex items-center gap-2 text-sm">
          <span className={cn(unread ? 'font-semibold' : 'font-medium text-muted-foreground')}>{n.title}</span>
          {unread && (
            <>
              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              <span className="sr-only">Unread</span>
            </>
          )}
        </p>
        <p className="mt-0.5 break-words text-sm text-muted-foreground">{n.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {n.eventAt && (
            <>
              {EVENT_LABEL[n.type]}: {formatDateTime(n.eventAt)} ·{' '}
            </>
          )}
          {timeAgo(n.createdAt)}
        </p>
      </button>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          title={unread ? 'Mark as read' : 'Mark as unread'}
          aria-label={unread ? 'Mark as read' : 'Mark as unread'}
          disabled={setRead.isPending}
          onClick={() => void toggle()}
        >
          {unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Delete"
          aria-label="Delete notification"
          className="text-destructive hover:text-destructive"
          disabled={remove.isPending}
          onClick={() => void onDelete()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
