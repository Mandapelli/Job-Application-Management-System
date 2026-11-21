import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api';

export function Pagination({
  meta,
  onPageChange,
  disabled,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
