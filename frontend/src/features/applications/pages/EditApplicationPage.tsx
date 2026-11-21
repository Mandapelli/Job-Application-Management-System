import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { ApplicationForm } from '../components/ApplicationForm';
import { useApplication, useUpdateApplication } from '../hooks';
import { toFormValues } from '../schemas';

export function EditApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useApplication(id);
  const update = useUpdateApplication();

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    const notFound = axios.isAxiosError(query.error) && query.error.response?.status === 404;
    return (
      <Card className="mx-auto max-w-3xl">
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/applications/${app.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit application</h1>
      </div>

      <ApplicationForm
        mode="edit"
        defaultValues={toFormValues(app)}
        submitLabel="Save changes"
        onCancel={() => navigate(`/applications/${app.id}`)}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: app.id, payload });
          toast.success('Application updated');
          navigate(`/applications/${app.id}`);
        }}
      />
    </div>
  );
}
