import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Recruiter } from '../types';

const COLUMNS = ['Name', 'Company', 'Email', 'Phone', 'Applications', 'Actions'];

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

export function RecruitersTable({
  items,
  onDelete,
}: {
  items: Recruiter[];
  onDelete: (r: Recruiter) => void;
}) {
  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <Link to={`/recruiters/${r.id}`} className="font-medium hover:text-primary hover:underline">
                {r.name}
              </Link>
              {r.title && <p className="text-xs text-muted-foreground">{r.title}</p>}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {r.company ? (
                <Link to={`/companies/${r.company.id}`} className="hover:text-primary hover:underline">
                  {r.company.name}
                </Link>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {r.email ? (
                <a href={`mailto:${r.email}`} className="hover:text-primary hover:underline">
                  {r.email}
                </a>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{r.phone ?? '—'}</TableCell>
            <TableCell>{r._count?.applications ?? 0}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="icon" title="View details">
                  <Link to={`/recruiters/${r.id}`} aria-label={`View ${r.name}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Edit">
                  <Link to={`/recruiters/${r.id}/edit`} aria-label={`Edit ${r.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label={`Delete ${r.name}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(r)}
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

export function RecruitersTableSkeleton({ rows = 6 }: { rows?: number }) {
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
