import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { InterviewsTable, InterviewsTableSkeleton } from '../components/InterviewsTable';
import { useDeleteInterview, useInterviews } from '../hooks';
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  type Interview,
  type InterviewListParams,
} from '../types';

type Tab = 'upcoming' | 'past' | 'all';
const TABS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];
const ALL = 'ALL';

function parse(sp: URLSearchParams): InterviewListParams & { tab: Tab } {
  const tab = (['upcoming', 'past', 'all'] as const).find((t) => t === sp.get('when')) ?? 'upcoming';
  const page = Number(sp.get('page'));
  const status = INTERVIEW_STATUSES.find((s) => s === sp.get('status'));
  return {
    tab,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    // The Upcoming tab already means "scheduled", so a status filter only applies to Past and All.
    status: tab === 'upcoming' ? undefined : status,
    when: tab === 'all' ? undefined : tab,
    sortBy: 'scheduledAt',
    sortOrder: tab === 'upcoming' ? 'asc' : 'desc', // soonest first for what's coming, latest first for history
  };
}

export function InterviewsPage() {
  const [sp, setSp] = useSearchParams();
  const { tab, ...params } = useMemo(() => parse(sp), [sp]);
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null);
  const remove = useDeleteInterview();

  const patch = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  useEffect(() => {
    if ((debouncedSearch || undefined) !== params.search) patch({ search: debouncedSearch || undefined });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useInterviews(params);

  const lastPage = query.data?.meta.totalPages;
  useEffect(() => {
    if (!query.isPlaceholderData && query.data?.items.length === 0 && lastPage && params.page > lastPage) {
      patch({ page: lastPage > 1 ? String(lastPage) : undefined });
    }
  }, [query.data, query.isPlaceholderData, lastPage, params.page, patch]);

  const hasFilters = !!(params.search || params.status);
  const clear = () => {
    setSearchText('');
    setSp(tab === 'upcoming' ? {} : { when: tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">Your interview schedule, feedback and results.</p>
        </div>
        <Button asChild>
          <Link to="/interviews/new">
            <Plus className="h-4 w-4" /> Schedule interview
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b p-4">
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Show interviews">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={tab === t.value}
                onClick={() => patch({ when: t.value === 'upcoming' ? undefined : t.value, status: undefined })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search job, company or interviewer"
                aria-label="Search interviews"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            {tab !== 'upcoming' && (
              <Select
                value={params.status ?? ALL}
                onValueChange={(v) => patch({ status: v === ALL ? undefined : v })}
              >
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {INTERVIEW_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {INTERVIEW_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {query.isPending ? (
          <InterviewsTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching interviews"
              description="Try different search words or clear the filters."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming interviews' : tab === 'past' ? 'No past interviews' : 'No interviews yet'}
              description="Schedule an interview for one of your applications to see it here."
              action={
                <Button asChild>
                  <Link to="/interviews/new">
                    <Plus className="h-4 w-4" /> Schedule interview
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <InterviewsTable items={query.data.items} onDelete={setDeleteTarget} />
            </div>
            <Pagination
              meta={query.data.meta}
              disabled={query.isPlaceholderData}
              onPageChange={(page) => patch({ page: String(page) })}
            />
          </>
        )}
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this interview?"
        description={
          <>
            The interview for <strong>{deleteTarget?.application.jobTitle}</strong> at{' '}
            <strong>{deleteTarget?.application.companyName}</strong>
            {deleteTarget && <> on {formatDateTime(deleteTarget.scheduledAt)}</>}, including its feedback, will be
            permanently deleted.
          </>
        }
        successMessage="Interview deleted"
        onConfirm={() => remove.mutateAsync(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
