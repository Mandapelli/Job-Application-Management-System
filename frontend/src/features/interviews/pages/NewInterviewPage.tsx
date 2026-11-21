import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { InterviewForm } from '../components/InterviewForm';
import { useCreateInterview } from '../hooks';

export function NewInterviewPage() {
  const navigate = useNavigate();
  const create = useCreateInterview();
  // "Schedule interview" on an application's page links here with ?applicationId=… so it is preselected.
  const applicationId = useSearchParams()[0].get('applicationId') ?? '';
  const back = applicationId ? `/applications/${applicationId}` : '/interviews';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={back}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Schedule interview</h1>
      </div>
      <InterviewForm
        mode="create"
        defaultValues={{ applicationId }}
        submitLabel="Schedule interview"
        onCancel={() => navigate(back)}
        onSubmit={async (payload) => {
          const interview = await create.mutateAsync(payload);
          toast.success('Interview scheduled');
          navigate(`/interviews/${interview.id}`);
        }}
      />
    </div>
  );
}
