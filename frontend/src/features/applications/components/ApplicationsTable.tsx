import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { EMPLOYMENT_LABELS, type Application } from '../types';
import { StatusBadge } from './StatusBadge';

const COLUMNS = ['Company', 'Job title', 'Location', 'Applied', 'Type', 'Status', 'Actions'];

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

export function ApplicationsTable({
  items,
  onDelete,
}: {
  items: Application[];
  onDelete: (app: Application) => void;
}) {
  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((app) => (
          <TableRow key={app.id}>
            <TableCell className="font-medium">
              <Link to={`/applications/${app.id}`} className="hover:text-primary hover:underline">
                {app.companyName}
              </Link>
            </TableCell>
            <TableCell>{app.jobTitle}</TableCell>
            <TableCell className="text-muted-foreground">
              {app.location ?? '—'}
              {app.workMode && <span className="ml-1 text-xs">({app.workMode.toLowerCase()})</span>}
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(app.appliedDate)}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {app.employmentType ? EMPLOYMENT_LABELS[app.employmentType] : '—'}
            </TableCell>
            <TableCell>
              <StatusBadge status={app.status} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="icon" title="View details">
                  <Link to={`/applications/${app.id}`} aria-label={`View ${app.jobTitle} at ${app.companyName}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Edit">
                  <Link to={`/applications/${app.id}/edit`} aria-label={`Edit ${app.jobTitle} at ${app.companyName}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label={`Delete ${app.jobTitle} at ${app.companyName}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(app)}
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

export function ApplicationsTableSkeleton({ rows = 6 }: { rows?: number }) {
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
