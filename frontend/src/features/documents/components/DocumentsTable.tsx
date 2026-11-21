import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBytes, formatDate } from '@/lib/format';
import { downloadDocument } from '../hooks';
import type { DocumentItem } from '../types';
import { TypeBadge } from './TypeBadge';

const COLUMNS = ['Name', 'Type', 'Size', 'Uploaded', 'Applications', 'Actions'];

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

export function DocumentsTable({ items, onDelete }: { items: DocumentItem[]; onDelete: (d: DocumentItem) => void }) {
  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="max-w-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <Link to={`/documents/${d.id}/edit`} className="block truncate font-medium hover:text-primary hover:underline">
                    {d.name}
                  </Link>
                  {d.name !== d.fileName && <p className="truncate text-xs text-muted-foreground">{d.fileName}</p>}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <TypeBadge type={d.type} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatBytes(d.sizeBytes)}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
            <TableCell>{d._count?.applications ?? 0}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" title="Download" aria-label={`Download ${d.name}`} onClick={() => void downloadDocument(d.id, d.fileName)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button asChild variant="ghost" size="icon" title="Edit">
                  <Link to={`/documents/${d.id}/edit`} aria-label={`Edit ${d.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label={`Delete ${d.name}`}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(d)}
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

export function DocumentsTableSkeleton({ rows = 6 }: { rows?: number }) {
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
