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
import { cn } from '@/lib/utils';
import { TasksTable, TasksTableSkeleton } from '../components/TasksTable';
import { useDeleteTask, useTaskSummary, useTasks } from '../hooks';
import { PRIORITIES, PRIORITY_LABELS, type Task, type TaskListParams, type TaskView } from '../types';

type Tab = TaskView | 'all';
const ALL = 'ALL';

const parse = (sp: URLSearchParams): TaskListParams & { tab: Tab } => {
  const tab = (['pending', 'overdue', 'completed', 'all'] as const).find((t) => t === sp.get('view')) ?? 'pending';
  const page = Number(sp.get('page'));
  return {
    tab,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    view: tab === 'all' ? undefined : tab,
    priority: PRIORITIES.find((p) => p === sp.get('priority')),
    // Open tasks: most urgent first. Finished tasks: most recently created first.
    sortBy: tab === 'completed' ? 'createdAt' : 'dueAt',
    sortOrder: tab === 'completed' ? 'desc' : 'asc',
  };
};

export function TasksPage() {
  const [sp, setSp] = useSearchParams();
  const { tab, ...params } = useMemo(() => parse(sp), [sp]);
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const remove = useDeleteTask();
  const summary = useTaskSummary();

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

  const query = useTasks(params);

  const lastPage = query.data?.meta.totalPages;
  useEffect(() => {
    if (!query.isPlaceholderData && query.data?.items.length === 0 && lastPage && params.page > lastPage) {
      patch({ page: lastPage > 1 ? String(lastPage) : undefined });
    }
  }, [query.data, query.isPlaceholderData, lastPage, params.page, patch]);

  const hasFilters = !!(params.search || params.priority);
  const clear = () => {
    setSearchText('');
    setSp(tab === 'pending' ? {} : { view: tab }, { replace: true });
  };

  const s = summary.data;
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'pending', label: 'Pending', count: s?.pending },
    { value: 'overdue', label: 'Overdue', count: s?.overdue },
    { value: 'completed', label: 'Completed', count: s?.completed },
    { value: 'all', label: 'All', count: s?.total },
  ];
  const emptyTitle = { pending: 'Nothing pending', overdue: 'Nothing overdue', completed: 'No completed tasks', all: 'No tasks yet' }[tab];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Follow-ups and reminders for your job search.</p>
        </div>
        <Button asChild>
          <Link to="/tasks/new">
            <Plus className="h-4 w-4" /> Add task
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b p-4">
          <div className="inline-flex flex-wrap rounded-lg bg-muted p-1" role="group" aria-label="Show tasks">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={tab === t.value}
                onClick={() => patch({ view: t.value === 'pending' ? undefined : t.value })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs',
                      t.value === 'overdue' && t.count > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-background/70',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tasks or applications"
                aria-label="Search tasks"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Select value={params.priority ?? ALL} onValueChange={(v) => patch({ priority: v === ALL ? undefined : v })}>
              <SelectTrigger aria-label="Filter by priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {query.isPending ? (
          <TasksTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching tasks"
              description="Try different search words or clear the filters."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={emptyTitle!}
              description="Add a follow-up, such as emailing a recruiter after an interview."
              action={
                <Button asChild>
                  <Link to="/tasks/new">
                    <Plus className="h-4 w-4" /> Add task
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <TasksTable items={query.data.items} onDelete={setDeleteTarget} />
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
        title="Delete this task?"
        description={
          <>
            <strong>{deleteTarget?.title}</strong> will be permanently deleted.
          </>
        }
        successMessage="Task deleted"
        onConfirm={() => remove.mutateAsync(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
