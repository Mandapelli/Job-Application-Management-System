import { AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isOverdue, type Task } from '../types';

/** Due date, flagged with an icon and the word "Overdue" (not colour alone) when it has passed. */
export function DueLabel({ task }: { task: Pick<Task, 'status' | 'dueAt'> }) {
  if (!task.dueAt) return <span className="text-muted-foreground">No due date</span>;
  const overdue = isOverdue(task);
  return (
    <span className={cn('inline-flex items-center gap-1', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
      {overdue && <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
      {formatDateTime(task.dueAt)}
      {overdue && <span className="text-xs">· Overdue</span>}
    </span>
  );
}
