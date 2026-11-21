import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RecordError } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/features/applications/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { useCompany, useDeleteCompany } from '../hooks';

export function CompanyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCompany(id);
  const remove = useDeleteCompany();
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
          entity="Company"
          backTo="/companies"
          backLabel="Back to companies"
        />
      </Card>
    );
  }

  const company = query.data;
  const applications = company.applications ?? [];
  const total = company._count?.applications ?? applications.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/companies"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to companies
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {[company.industry, company.location].filter(Boolean).join(' · ') || 'No details yet'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/companies/${company.id}/edit`}>
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
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    {company.website} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{company.notes || '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recruiters ({company._count?.recruiters ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {(company.recruiters ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No recruiters are linked to this company.</p>
              ) : (
                <ul className="divide-y">
                  {company.recruiters!.map((r) => (
                    <li key={r.id} className="py-2">
                      <Link to={`/recruiters/${r.id}`} className="text-sm font-medium hover:text-primary hover:underline">
                        {r.name}
                      </Link>
                      {r.title && <p className="text-xs text-muted-foreground">{r.title}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Applications ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No applications are linked to this company yet.
              </p>
            ) : (
              <ul className="divide-y">
                {applications.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <Link to={`/applications/${a.id}`} className="font-medium hover:text-primary hover:underline">
                        {a.jobTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground">Applied {formatDate(a.appliedDate)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
            {total > applications.length && (
              <p className="mt-3 text-xs text-muted-foreground">Showing the {applications.length} most recent.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleting}
        title="Delete this company?"
        description={
          <>
            <strong>{company.name}</strong> will be deleted. Its {total} application(s) are <strong>kept</strong>{' '}
            and just lose the link to this company.
          </>
        }
        successMessage="Company deleted"
        onConfirm={() => remove.mutateAsync(company.id)}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/companies', { replace: true })}
      />
    </div>
  );
}
