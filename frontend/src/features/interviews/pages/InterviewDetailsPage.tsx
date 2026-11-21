import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RecordError } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { InterviewStatusBadge, ResultBadge } from '../components/InterviewBadges';
import { useDeleteInterview, useInterview } from '../hooks';
import { TYPE_LABELS } from '../types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

export function InterviewDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useInterview(id);
  const remove = useDeleteInterview();
  const [deleting, setDeleting] = useState(false);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Card>
        <RecordError
          error={query.error}
          onRetry={() => void query.refetch()}
          entity="Interview"
          backTo="/interviews"
          backLabel="Back to interviews"
        />
      </Card>
    );
  }

  const i = query.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/interviews"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to interviews
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Round {i.round}: {TYPE_LABELS[i.type]}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <Link to={`/applications/${i.application.id}`} className="hover:text-primary hover:underline">
                {i.application.jobTitle} — {i.application.companyName}
              </Link>
              <InterviewStatusBadge status={i.status} />
              <ResultBadge result={i.result} />
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/interviews/${i.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Field label="When">{formatDateTime(i.scheduledAt)}</Field>
              <Field label="Duration">{i.durationMinutes} minutes</Field>
              <Field label="Interviewer">{i.interviewerName}</Field>
              <Field label="Location">{i.location}</Field>
              <Field label="Meeting link">
                {i.meetingUrl && (
                  <a
                    href={i.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Join meeting <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {i.feedback ? (
                <p className="whitespace-pre-wrap break-words text-sm">{i.feedback}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No feedback yet. Add it after the interview with <strong>Edit</strong>.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preparation notes</CardTitle>
            </CardHeader>
            <CardContent>
              {i.notes ? (
                <p className="whitespace-pre-wrap break-words text-sm">{i.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleting}
        title="Delete this interview?"
        description="The interview and its feedback will be permanently deleted. The application is not affected."
        successMessage="Interview deleted"
        onConfirm={() => remove.mutateAsync(i.id)}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/interviews', { replace: true })}
      />
    </div>
  );
}
