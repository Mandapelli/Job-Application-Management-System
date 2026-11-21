import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RecordError } from '@/components/StateMessages';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InterviewForm } from '../components/InterviewForm';
import { useInterview, useUpdateInterview } from '../hooks';
import { toInterviewFormValues } from '../schemas';

export function EditInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useInterview(id);
  const update = useUpdateInterview();

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
          entity="Interview"
          backTo="/interviews"
          backLabel="Back to interviews"
        />
      </Card>
    );
  }

  const interview = query.data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/interviews/${interview.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit interview</h1>
      </div>
      <InterviewForm
        mode="edit"
        defaultValues={toInterviewFormValues(interview)}
        applicationLabel={`${interview.application.jobTitle} — ${interview.application.companyName}`}
        submitLabel="Save changes"
        onCancel={() => navigate(`/interviews/${interview.id}`)}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: interview.id, payload });
          toast.success('Interview updated');
          navigate(`/interviews/${interview.id}`);
        }}
      />
    </div>
  );
}
