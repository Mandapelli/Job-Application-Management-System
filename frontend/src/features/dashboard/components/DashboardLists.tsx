import { CalendarDays, ListTodo, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/features/applications/components/StatusBadge';
import { TYPE_LABELS } from '@/features/interviews/types';
import { DueLabel } from '@/features/tasks/components/DueLabel';
import { PriorityBadge } from '@/features/tasks/components/PriorityBadge';
import { formatDate, formatDateTime, formatSalary } from '@/lib/format';
import type { DashboardSummary } from '../types';

export function UpcomingInterviewsList({ items }: { items: DashboardSummary['upcomingInterviews'] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
        <Link to="/interviews/new" className="text-sm font-medium text-primary hover:underline">
          Schedule one
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/interviews/${i.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline">
              {i.application.jobTitle}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{i.application.companyName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(i.scheduledAt)} · Round {i.round} · {TYPE_LABELS[i.type]}
            </p>
          </div>
          {i.meetingUrl && (
            <a
              href={i.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Video className="h-3.5 w-3.5" /> Join
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function OpenTasksList({ items }: { items: DashboardSummary['openTasks'] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ListTodo className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nothing to do right now.</p>
        <Link to="/tasks/new" className="text-sm font-medium text-primary hover:underline">
          Add a task
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/tasks/${t.id}/edit`} className="block truncate text-sm font-medium hover:text-primary hover:underline">
              {t.title}
            </Link>
            {t.application && (
              <p className="truncate text-xs text-muted-foreground">
                {t.application.jobTitle} · {t.application.companyName}
              </p>
            )}
            <p className="mt-1 text-xs">
              <DueLabel task={t} />
            </p>
          </div>
          <PriorityBadge priority={t.priority} />
        </li>
      ))}
    </ul>
  );
}

export function RecentApplicationsList({ items }: { items: DashboardSummary['recentApplications'] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">No applications yet.</p>
        <Link to="/applications/new" className="text-sm font-medium text-primary hover:underline">
          Add your first application
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/applications/${a.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline">
              {a.jobTitle}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{a.companyName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Added {formatDate(a.createdAt)}
              {(a.salaryMin != null || a.salaryMax != null) &&
                ` · ${formatSalary(a.salaryMin, a.salaryMax, a.salaryCurrency)}`}
            </p>
          </div>
          <StatusBadge status={a.status} />
        </li>
      ))}
    </ul>
  );
}
