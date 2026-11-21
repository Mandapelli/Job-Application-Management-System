import { Plus, Search, Upload } from 'lucide-react';
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
import { DocumentsTable, DocumentsTableSkeleton } from '../components/DocumentsTable';
import { useDeleteDocument, useDocuments } from '../hooks';
import { DOCUMENT_TYPES, TYPE_LABELS, type DocumentItem, type DocumentListParams } from '../types';

const ALL = 'ALL';
const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'sizeBytes:desc', label: 'Largest first' },
];

function parseParams(sp: URLSearchParams): DocumentListParams {
  const page = Number(sp.get('page'));
  const [by, order] = (sp.get('sort') ?? 'createdAt:desc').split(':');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 10,
    search: sp.get('search') || undefined,
    type: DOCUMENT_TYPES.find((t) => t === sp.get('type')),
    sortBy: by === 'name' || by === 'sizeBytes' ? by : 'createdAt',
    sortOrder: order === 'asc' ? 'asc' : 'desc',
  };
}

export function DocumentsPage() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => parseParams(sp), [sp]);
  const [searchText, setSearchText] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchText.trim());
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const remove = useDeleteDocument();

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

  const query = useDocuments(params);
  const hasFilters = !!(params.search || params.type);

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
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Your resumes, cover letters and other files.</p>
        </div>
        <Button asChild>
          <Link to="/documents/new">
            <Plus className="h-4 w-4" /> Upload document
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, file or description"
              aria-label="Search documents"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Select value={params.type ?? ALL} onValueChange={(v) => patch({ type: v === ALL ? undefined : v })}>
            <SelectTrigger aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${params.sortBy}:${params.sortOrder}`}
            onValueChange={(v) => patch({ sort: v === 'createdAt:desc' ? undefined : v })}
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
          <DocumentsTableSkeleton />
        ) : query.isError ? (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching documents"
              description="Try different search words or clear the filters."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No documents yet"
              description="Upload your resume (PDF, DOC or DOCX), then attach it to the applications you send it with."
              action={
                <Button asChild>
                  <Link to="/documents/new">
                    <Upload className="h-4 w-4" /> Upload document
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <DocumentsTable items={query.data.items} onDelete={setDeleteTarget} />
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
        title="Delete this document?"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> and its file will be permanently deleted
            {deleteTarget?._count?.applications ? ` and removed from ${deleteTarget._count.applications} application(s)` : ''}.
            The applications themselves are not affected.
          </>
        }
        successMessage="Document deleted"
        onConfirm={() => remove.mutateAsync(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
