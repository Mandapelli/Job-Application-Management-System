import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '../hooks';
import type { Task } from '../types';
import { DueLabel } from './DueLabel';
import { PriorityBadge } from './PriorityBadge';

const COLUMNS = ['', 'Task', 'Application', 'Due', 'Priority', 'Actions'];

function Head() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {COLUMNS.map((c, i) => (
          <TableHead key={i} className={cn(c === 'Actions' && 'text-right', i === 0 && 'w-10')}>
            {c || <span className="sr-only">Done</span>}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

export function TasksTable({ items, onDelete }: { items: Task[]; onDelete: (t: Task) => void }) {
  const update = useUpdateTask();

  const toggle = async (task: Task) => {
    const completing = task.status === 'PENDING';
    try {
      await update.mutateAsync({ id: task.id, payload: { status: completing ? 'COMPLETED' : 'PENDING' } });
      toast.success(completing ? 'Task completed' : 'Task reopened');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update task'));
    }
  };

  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((t) => {
          const done = t.status === 'COMPLETED';
          return (
            <TableRow key={t.id}>
              <TableCell>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-input accent-[hsl(var(--primary))]"
                  checked={done}
                  disabled={update.isPending}
                  onChange={() => void toggle(t)}
                  aria-label={done ? `Reopen "${t.title}"` : `Mark "${t.title}" as completed`}
                />
              </TableCell>
              <TableCell className={cn('max-w-xs', done && 'text-muted-foreground line-through')}>
                <Link to={`/tasks/${t.id}/edit`} className="font-medium hover:text-primary hover:underline">
                  {t.title}
                </Link>
              </TableCell>
              <TableCell>
                {t.application ? (
                  <Link to={`/applications/${t.application.id}`} className="hover:text-primary hover:underline">
                    {t.application.jobTitle}
                    <span className="block text-xs text-muted-foreground">{t.application.companyName}</span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {done ? <span className="text-muted-foreground">Done</span> : <DueLabel task={t} />}
              </TableCell>
              <TableCell>
                <PriorityBadge priority={t.priority} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Edit">
                    <Link to={`/tasks/${t.id}/edit`} aria-label={`Edit "${t.title}"`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    aria-label={`Delete "${t.title}"`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function TasksTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Table>
      <Head />
      <TableBody>
        {Array.from({ length: rows }, (_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            {COLUMNS.map((_c, j) => (
              <TableCell key={j}>
                <Skeleton className="h-5 w-full max-w-[140px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
