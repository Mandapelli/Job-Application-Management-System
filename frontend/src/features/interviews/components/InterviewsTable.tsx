import { Eye, Pencil, Trash2, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { TYPE_LABELS, type Interview } from '../types';
import { InterviewStatusBadge, ResultBadge } from './InterviewBadges';

const COLUMNS = ['When', 'Application', 'Round', 'Type', 'Status', 'Result', 'Actions'];

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

export function InterviewsTable({
  items,
  onDelete,
}: {
  items: Interview[];
  onDelete: (i: Interview) => void;
}) {
  return (
    <Table>
      <Head />
      <TableBody>
        {items.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="whitespace-nowrap font-medium">
              <Link to={`/interviews/${i.id}`} className="hover:text-primary hover:underline">
                {formatDateTime(i.scheduledAt)}
              </Link>
            </TableCell>
            <TableCell>
              <Link to={`/applications/${i.application.id}`} className="hover:text-primary hover:underline">
                {i.application.jobTitle}
              </Link>
              <p className="text-xs text-muted-foreground">{i.application.companyName}</p>
            </TableCell>
            <TableCell>{i.round}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">{TYPE_LABELS[i.type]}</TableCell>
            <TableCell>
              <InterviewStatusBadge status={i.status} />
            </TableCell>
            <TableCell>
              <ResultBadge result={i.result} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                {i.meetingUrl && i.status === 'SCHEDULED' && (
                  <Button asChild variant="ghost" size="icon" title="Join meeting">
                    <a href={i.meetingUrl} target="_blank" rel="noopener noreferrer" aria-label="Join meeting">
                      <Video className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button asChild variant="ghost" size="icon" title="View details">
                  <Link to={`/interviews/${i.id}`} aria-label="View interview">
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" title="Edit">
                  <Link to={`/interviews/${i.id}/edit`} aria-label="Edit interview">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  aria-label="Delete interview"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(i)}
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

export function InterviewsTableSkeleton({ rows = 6 }: { rows?: number }) {
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
