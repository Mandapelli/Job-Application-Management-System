import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RecordError } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/features/applications/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { useDeleteRecruiter, useRecruiter } from '../hooks';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm">{children || '—'}</div>
    </div>
  );
}

export function RecruiterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useRecruiter(id);
  const remove = useDeleteRecruiter();
  const [deleting, setDeleting] = useState(false);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Card>
        <RecordError
          error={query.error}
          onRetry={() => void query.refetch()}
          entity="Recruiter"
          backTo="/recruiters"
          backLabel="Back to recruiters"
        />
      </Card>
    );
  }

  const r = query.data;
  const applications = r.applications ?? [];
  const total = r._count?.applications ?? applications.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/recruiters"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to recruiters
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{r.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {r.title}
              {r.title && r.company && ' at '}
              {r.company && (
                <Link to={`/companies/${r.company.id}`} className="hover:text-primary hover:underline">
                  {r.company.name}
                </Link>
              )}
              {!r.title && !r.company && 'No title or company'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/recruiters/${r.id}/edit`}>
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
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Email">
              {r.email && (
                <a href={`mailto:${r.email}`} className="break-all text-primary hover:underline">
                  {r.email}
                </a>
              )}
            </Field>
            <Field label="Phone">{r.phone}</Field>
            <Field label="LinkedIn">
              {r.linkedinUrl && (
                <a
                  href={r.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open profile <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </Field>
            <Field label="Notes">{r.notes && <p className="whitespace-pre-wrap">{r.notes}</p>}</Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Applications ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications are linked to this recruiter yet.</p>
            ) : (
              <ul className="divide-y">
                {applications.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <Link to={`/applications/${a.id}`} className="font-medium hover:text-primary hover:underline">
                        {a.jobTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {a.companyName} · Applied {formatDate(a.appliedDate)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleting}
        title="Delete this recruiter?"
        description={
          <>
            <strong>{r.name}</strong> will be deleted. Its {total} application(s) are <strong>kept</strong> and keep
            the contact details already saved on them.
          </>
        }
        successMessage="Recruiter deleted"
        onConfirm={() => remove.mutateAsync(r.id)}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/recruiters', { replace: true })}
      />
    </div>
  );
}
