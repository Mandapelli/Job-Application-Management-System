import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RecruiterForm } from '../components/RecruiterForm';
import { useCreateRecruiter } from '../hooks';

export function NewRecruiterPage() {
  const navigate = useNavigate();
  const create = useCreateRecruiter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/recruiters"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to recruiters
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add recruiter</h1>
      </div>
      <RecruiterForm
        submitLabel="Save recruiter"
        onCancel={() => navigate('/recruiters')}
        onSubmit={async (payload) => {
          const recruiter = await create.mutateAsync(payload);
          toast.success('Recruiter added');
          navigate(`/recruiters/${recruiter.id}`);
        }}
      />
    </div>
  );
}
