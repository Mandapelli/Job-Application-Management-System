import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useTasks } from '../hooks';
import { DueLabel } from './DueLabel';
import { PriorityBadge } from './PriorityBadge';

/** The tasks of one application, shown on its details page. Open tasks come first. */
export function ApplicationTasks({ applicationId }: { applicationId: string }) {
  const query = useTasks({ page: 1, limit: 20, applicationId, sortBy: 'dueAt', sortOrder: 'asc' });
  // The API sorts by due date; keep finished tasks at the bottom.
  const items = [...(query.data?.items ?? [])].sort((a, b) => Number(a.status === 'COMPLETED') - Number(b.status === 'COMPLETED'));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tasks</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to={`/tasks/new?applicationId=${applicationId}`}>
            <Plus className="h-4 w-4" /> Add task
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks for this application yet.</p>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link
                    to={`/tasks/${t.id}/edit`}
                    className={cn('text-sm font-medium hover:text-primary hover:underline', t.status === 'COMPLETED' && 'text-muted-foreground line-through')}
                  >
                    {t.title}
                  </Link>
                  <p className="text-xs">{t.status === 'COMPLETED' ? <span className="text-muted-foreground">Done</span> : <DueLabel task={t} />}</p>
                </div>
                <PriorityBadge priority={t.priority} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
