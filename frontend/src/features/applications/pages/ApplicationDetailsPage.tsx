import axios from 'axios';
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationInterviews } from '@/features/interviews/components/ApplicationInterviews';
import { ApplicationDocuments } from '@/features/documents/components/ApplicationDocuments';
import { ApplicationTasks } from '@/features/tasks/components/ApplicationTasks';
import { getErrorMessage } from '@/lib/apiError';
import { formatDate, formatDateTime, formatSalary } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DeleteApplicationDialog } from '../components/DeleteApplicationDialog';
import { StatusBadge } from '../components/StatusBadge';
import { useApplication, useChangeStatus } from '../hooks';
import {
  EMPLOYMENT_LABELS,
  STATUSES,
  STATUS_LABELS,
  WORK_MODE_LABELS,
  type Application,
  type ApplicationStatus,
} from '../types';

function Detail({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  // min-w-0 + break-words let long values (emails, URLs) wrap inside their own cell instead of overflowing into the next one.
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function StatusControl({ app }: { app: Application }) {
  const change = useChangeStatus();

  const onChange = async (status: string) => {
    if (status === app.status) return;
    try {
      await change.mutateAsync({ id: app.id, status: status as ApplicationStatus });
      toast.success(`Status changed to ${STATUS_LABELS[status as ApplicationStatus]}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update status'));
    }
  };

  return (
    <Select value={app.status} onValueChange={onChange} disabled={change.isPending}>
      <SelectTrigger className="w-40" aria-label="Change status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ApplicationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useApplication(id);
  const [deleting, setDeleting] = useState(false);

  if (query.isPending) return <DetailsSkeleton />;

  if (query.isError) {
    const notFound = axios.isAxiosError(query.error) && query.error.response?.status === 404;
    return (
      <Card>
        {notFound ? (
          <EmptyState
            title="Application not found"
            description="It may have been deleted, or the link is wrong."
            action={
              <Button asChild>
                <Link to="/applications">Back to applications</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        )}
      </Card>
    );
  }

  const app = query.data;
  const history = app.statusHistory ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/applications"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to applications
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{app.jobTitle}</h1>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              {app.companyId ? (
                <Link to={`/companies/${app.companyId}`} className="hover:text-primary hover:underline">
                  {app.companyName}
                </Link>
              ) : (
                app.companyName
              )}{' '}
              <StatusBadge status={app.status} />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusControl app={app} />
            <Button asChild variant="outline">
              <Link to={`/applications/${app.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Location">{app.location}</Detail>
                <Detail label="Work mode">{app.workMode && WORK_MODE_LABELS[app.workMode]}</Detail>
                <Detail label="Employment type">{app.employmentType && EMPLOYMENT_LABELS[app.employmentType]}</Detail>
                <Detail label="Salary">{formatSalary(app.salaryMin, app.salaryMax, app.salaryCurrency)}</Detail>
                <Detail label="Applied on">{formatDate(app.appliedDate)}</Detail>
                <Detail label="Job posting">
                  {app.jobUrl && (
                    <a
                      href={app.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open posting <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Detail>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recruiter</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Name">
                  {app.recruiterName &&
                    (app.recruiterId ? (
                      <Link to={`/recruiters/${app.recruiterId}`} className="text-primary hover:underline">
                        {app.recruiterName}
                      </Link>
                    ) : (
                      app.recruiterName
                    ))}
                </Detail>
                <Detail label="Phone">{app.recruiterPhone}</Detail>
                <Detail label="Email" className="sm:col-span-2">
                  {app.recruiterEmail && (
                    <a href={`mailto:${app.recruiterEmail}`} className="break-all text-primary hover:underline">
                      {app.recruiterEmail}
                    </a>
                  )}
                </Detail>
              </dl>
            </CardContent>
          </Card>

          <ApplicationInterviews applicationId={app.id} />
          <ApplicationTasks applicationId={app.id} />
          <ApplicationDocuments applicationId={app.id} />

          {(app.jobDescription || app.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description and notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {app.jobDescription && (
                  <Detail label="Job description">
                    <p className="whitespace-pre-wrap">{app.jobDescription}</p>
                  </Detail>
                )}
                {app.notes && (
                  <Detail label="Notes">
                    <p className="whitespace-pre-wrap">{app.notes}</p>
                  </Detail>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l pl-5">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {h.fromStatus ? (
                      <>
                        <StatusBadge status={h.fromStatus} />
                        <span className="text-muted-foreground">→</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Added as</span>
                    )}
                    <StatusBadge status={h.toStatus} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(h.changedAt)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <DeleteApplicationDialog
        target={deleting ? app : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/applications', { replace: true })}
      />
    </div>
  );
}
