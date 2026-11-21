import axios from 'axios';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/apiError';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Shown when loading a single record fails: a friendly "not found" for 404s, a retry otherwise. */
export function RecordError({
  error,
  onRetry,
  entity,
  backTo,
  backLabel,
}: {
  error: unknown;
  onRetry: () => void;
  entity: string;
  backTo: string;
  backLabel: string;
}) {
  const notFound = axios.isAxiosError(error) && error.response?.status === 404;
  return notFound ? (
    <EmptyState
      title={`${entity} not found`}
      description="It may have been deleted, or the link is wrong."
      action={
        <Button asChild>
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      }
    />
  ) : (
    <ErrorState message={getErrorMessage(error)} onRetry={onRetry} />
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center" role="alert">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <p className="font-medium">Could not load data</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-2" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
