import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RecordError } from '@/components/StateMessages';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RecruiterForm } from '../components/RecruiterForm';
import { useRecruiter, useUpdateRecruiter } from '../hooks';
import { toRecruiterFormValues } from '../schemas';

export function EditRecruiterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useRecruiter(id);
  const update = useUpdateRecruiter();

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Card className="mx-auto max-w-3xl">
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

  const recruiter = query.data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/recruiters/${recruiter.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit recruiter</h1>
      </div>
      <RecruiterForm
        defaultValues={toRecruiterFormValues(recruiter)}
        submitLabel="Save changes"
        onCancel={() => navigate(`/recruiters/${recruiter.id}`)}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: recruiter.id, payload });
          toast.success('Recruiter updated');
          navigate(`/recruiters/${recruiter.id}`);
        }}
      />
    </div>
  );
}
