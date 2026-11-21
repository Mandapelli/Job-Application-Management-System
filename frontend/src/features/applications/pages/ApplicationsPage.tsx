import { Columns3, List, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { ApplicationFilters } from '../components/ApplicationFilters';
import { ApplicationsTable, ApplicationsTableSkeleton } from '../components/ApplicationsTable';
import { DeleteApplicationDialog, type DeleteTarget } from '../components/DeleteApplicationDialog';
import { KanbanBoard } from '../components/KanbanBoard';
import { useApplications } from '../hooks';
import { EMPLOYMENT_TYPES, STATUSES, WORK_MODES, type ListParams } from '../types';

type View = 'table' | 'kanban';

const pick = <T extends string>(value: string | null, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;

// The URL is the single source of truth for view and filters, so refresh/back/share all keep the same screen.
function parseParams(sp: URLSearchParams): ListParams {
  const page = Number(sp.get('page'));
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    location: sp.get('location') || undefined,
    status: pick(sp.get('status'), STATUSES),
    workMode: pick(sp.get('workMode'), WORK_MODES),
    employmentType: pick(sp.get('employmentType'), EMPLOYMENT_TYPES),
    sortBy: sp.get('sortBy') === 'appliedDate' ? 'appliedDate' : 'createdAt',
    sortOrder: sp.get('sortOrder') === 'asc' ? 'asc' : 'desc',
  };
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const item = (value: View, label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={view === value}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        view === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Choose view">
      {item('table', 'Table', List)}
      {item('kanban', 'Kanban', Columns3)}
    </div>
  );
}

export function ApplicationsPage() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => parseParams(sp), [sp]);
  const view: View = sp.get('view') === 'kanban' ? 'kanban' : 'table';
  const isKanban = view === 'kanban';

  const [searchText, setSearchText] = useState(params.search ?? '');
  const [locationText, setLocationText] = useState(params.location ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const debouncedLocation = useDebouncedValue(locationText.trim());

  /** Updates URL params. Any change except page itself sends you back to page 1. */
  const patch = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  // Push debounced text into the URL (only when it actually differs, so this can't loop).
  useEffect(() => {
    if ((debouncedSearch || undefined) !== params.search) patch({ search: debouncedSearch || undefined });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((debouncedLocation || undefined) !== params.location)
      patch({ location: debouncedLocation || undefined });
  }, [debouncedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // The board has a column per status, so the status filter doesn't count there.
  const hasFilters = !!(
    params.search ||
    params.location ||
    (!isKanban && params.status) ||
    params.workMode ||
    params.employmentType
  );

  const clearFilters = () => {
    setSearchText('');
    setLocationText('');
    setSp(isKanban ? { view: 'kanban' } : {}, { replace: true });
  };

  const query = useApplications(params, !isKanban);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // If the last item on the last page was deleted, step back to the last page that still exists.
  const lastPage = query.data?.meta.totalPages;
  useEffect(() => {
    if (!query.isPlaceholderData && query.data?.items.length === 0 && lastPage && params.page > lastPage) {
      patch({ page: lastPage > 1 ? String(lastPage) : undefined });
    }
  }, [query.data, query.isPlaceholderData, lastPage, params.page, patch]);

  const kanbanFilters = useMemo(
    () => ({
      search: params.search,
      location: params.location,
      workMode: params.workMode,
      employmentType: params.employmentType,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
    [params.search, params.location, params.workMode, params.employmentType, params.sortBy, params.sortOrder],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Track every job you have applied for.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle view={view} onChange={(v) => patch({ view: v === 'kanban' ? 'kanban' : undefined })} />
          <Button asChild>
            <Link to="/applications/new">
              <Plus className="h-4 w-4" /> Add application
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <ApplicationFilters
          params={params}
          searchText={searchText}
          locationText={locationText}
          hasFilters={hasFilters}
          hideStatus={isKanban}
          onSearchTextChange={setSearchText}
          onLocationTextChange={setLocationText}
          onChange={patch}
          onClear={clearFilters}
        />

        {isKanban ? (
          <KanbanBoard filters={kanbanFilters} />
        ) : query.isPending ? (
          <ApplicationsTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching applications"
              description="Try different search words or clear the filters."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No applications yet"
              description="Add your first application to start tracking your job search."
              action={
                <Button asChild>
                  <Link to="/applications/new">
                    <Plus className="h-4 w-4" /> Add application
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <ApplicationsTable items={query.data.items} onDelete={setDeleteTarget} />
            </div>
            <Pagination
              meta={query.data.meta}
              disabled={query.isPlaceholderData}
              onPageChange={(page) => patch({ page: String(page) })}
            />
          </>
        )}
      </Card>

      <DeleteApplicationDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
