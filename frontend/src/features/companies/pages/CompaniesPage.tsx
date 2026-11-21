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
import { CompaniesTable, CompaniesTableSkeleton } from '../components/CompaniesTable';
import { useCompanies, useDeleteCompany } from '../hooks';
import type { Company, CompanyListParams } from '../types';

const SORTS = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'createdAt:desc', label: 'Newest added' },
  { value: 'createdAt:asc', label: 'Oldest added' },
];

function parseParams(sp: URLSearchParams): CompanyListParams {
  const page = Number(sp.get('page'));
  const [by, order] = (sp.get('sort') ?? 'name:asc').split(':');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    sortBy: by === 'createdAt' ? 'createdAt' : 'name',
    sortOrder: order === 'desc' ? 'desc' : 'asc',
  };
}

export function CompaniesPage() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => parseParams(sp), [sp]);
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const remove = useDeleteCompany();

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

  const query = useCompanies(params);

  // After deleting the last row of the last page, step back to a page that exists.
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
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Organizations you are applying to.</p>
        </div>
        <Button asChild>
          <Link to="/companies/new">
            <Plus className="h-4 w-4" /> Add company
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, industry or location"
              aria-label="Search companies"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
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
          <CompaniesTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          params.search ? (
            <EmptyState
              title="No matching companies"
              description="Try different search words."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No companies yet"
              description="Add the companies you apply to, then link applications and recruiters to them."
              action={
                <Button asChild>
                  <Link to="/companies/new">
                    <Plus className="h-4 w-4" /> Add company
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <CompaniesTable items={query.data.items} onDelete={setDeleteTarget} />
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
        title="Delete this company?"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> will be deleted. Its {deleteTarget?._count?.applications ?? 0}{' '}
            application(s) are <strong>kept</strong> and just lose the link to this company.
          </>
        }
        successMessage="Company deleted"
        onConfirm={() => remove.mutateAsync(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
