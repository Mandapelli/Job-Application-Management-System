import { ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Company } from '../types';

const COLUMNS = ['Company', 'Industry', 'Location', 'Website', 'Applications', 'Actions'];

function Head() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {COLUMNS.map((c) => (
          <TableHead key={c} className={c === 'Actions' ? 'text-right' : undefined}>
            {c}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

export function CompaniesTable({
  items,
  onDelete,
}: {
  items: Company[];
  onDelete: (c: Company) => void;
}) {
  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              <Link to={`/companies/${c.id}`} className="hover:text-primary hover:underline">
                {c.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{c.industry ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">{c.location ?? '—'}</TableCell>
            <TableCell>
              {c.website ? (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>{c._count?.applications ?? 0}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="icon" title="View details">
                  <Link to={`/companies/${c.id}`} aria-label={`View ${c.name}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Edit">
                  <Link to={`/companies/${c.id}/edit`} aria-label={`Edit ${c.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label={`Delete ${c.name}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompaniesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Table>
      <Head />
      <TableBody>
        {Array.from({ length: rows }, (_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            {COLUMNS.map((c) => (
              <TableCell key={c}>
                <Skeleton className="h-5 w-full max-w-[140px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
