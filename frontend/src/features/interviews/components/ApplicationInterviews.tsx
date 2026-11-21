import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { useInterviews } from '../hooks';
import { TYPE_LABELS } from '../types';
import { InterviewStatusBadge, ResultBadge } from './InterviewBadges';

/** The interviews of one application, shown on its details page. */
export function ApplicationInterviews({ applicationId }: { applicationId: string }) {
  const query = useInterviews({
    page: 1,
    limit: 20,
    applicationId,
    sortBy: 'scheduledAt',
    sortOrder: 'asc', // rounds in the order they happen
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Interviews</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to={`/interviews/new?applicationId=${applicationId}`}>
            <Plus className="h-4 w-4" /> Schedule
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews scheduled for this application yet.</p>
        ) : (
          <ul className="divide-y">
            {query.data.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link to={`/interviews/${i.id}`} className="text-sm font-medium hover:text-primary hover:underline">
                    Round {i.round}: {TYPE_LABELS[i.type]}
                  </Link>
                  <p className="text-xs text-muted-foreground">{formatDateTime(i.scheduledAt)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <InterviewStatusBadge status={i.status} />
                  <ResultBadge result={i.result} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
