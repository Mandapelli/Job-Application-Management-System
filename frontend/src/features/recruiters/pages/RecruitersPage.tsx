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
import { useCompanies } from '@/features/companies/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { RecruitersTable, RecruitersTableSkeleton } from '../components/RecruitersTable';
import { useDeleteRecruiter, useRecruiters } from '../hooks';
import type { Recruiter, RecruiterListParams } from '../types';

const ALL = 'ALL';
const SORTS = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'createdAt:desc', label: 'Newest added' },
  { value: 'createdAt:asc', label: 'Oldest added' },
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseParams(sp: URLSearchParams): RecruiterListParams {
  const page = Number(sp.get('page'));
  const [by, order] = (sp.get('sort') ?? 'name:asc').split(':');
  const companyId = sp.get('companyId');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    companyId: companyId && UUID.test(companyId) ? companyId : undefined,
    sortBy: by === 'createdAt' ? 'createdAt' : 'name',
    sortOrder: order === 'desc' ? 'desc' : 'asc',
  };
}

export function RecruitersPage() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => parseParams(sp), [sp]);
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [deleteTarget, setDeleteTarget] = useState<Recruiter | null>(null);
  const remove = useDeleteRecruiter();
  const companies = useCompanies({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });

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

  const query = useRecruiters(params);
  const hasFilters = !!(params.search || params.companyId);

  const lastPage = query.data?.meta.totalPages;
  useEffect(() => {
    if (!query.isPlaceholderData && query.data?.items.length === 0 && lastPage && params.page > lastPage) {
      patch({ page: lastPage > 1 ? String(lastPage) : undefined });
    }
  }, [query.data, query.isPlaceholderData, lastPage, params.page, patch]);

  const clear = () => {
    setSearchText('');
    setSp({}, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiters</h1>
          <p className="text-muted-foreground">The people you are in touch with about jobs.</p>
        </div>
        <Button asChild>
          <Link to="/recruiters/new">
            <Plus className="h-4 w-4" /> Add recruiter
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, title or company"
              aria-label="Search recruiters"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Select
            value={params.companyId ?? ALL}
            onValueChange={(v) => patch({ companyId: v === ALL ? undefined : v })}
          >
            <SelectTrigger aria-label="Filter by company">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All companies</SelectItem>
              {companies.data?.items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${params.sortBy}:${params.sortOrder}`}
            onValueChange={(v) => patch({ sort: v === 'name:asc' ? undefined : v })}
          >
            <SelectTrigger aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isPending ? (
          <RecruitersTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching recruiters"
              description="Try different search words or clear the filters."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No recruiters yet"
              description="Save the recruiters you talk to, then link them to your applications."
              action={
                <Button asChild>
                  <Link to="/recruiters/new">
                    <Plus className="h-4 w-4" /> Add recruiter
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <RecruitersTable items={query.data.items} onDelete={setDeleteTarget} />
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
        title="Delete this recruiter?"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> will be deleted. Its {deleteTarget?._count?.applications ?? 0}{' '}
            application(s) are <strong>kept</strong> and keep the contact details already saved on them.
          </>
        }
        successMessage="Recruiter deleted"
        onConfirm={() => remove.mutateAsync(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
