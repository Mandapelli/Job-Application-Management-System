import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApplicationForm } from '../components/ApplicationForm';
import { useCreateApplication } from '../hooks';

export function NewApplicationPage() {
  const navigate = useNavigate();
  const create = useCreateApplication();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/applications"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to applications
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add application</h1>
      </div>

      <ApplicationForm
        mode="create"
        submitLabel="Save application"
        onCancel={() => navigate('/applications')}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload); // errors are shown by the form
          toast.success('Application added');
          navigate('/applications');
        }}
      />
    </div>
  );
}
