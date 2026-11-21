import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CompanyForm } from '../components/CompanyForm';
import { useCreateCompany } from '../hooks';

export function NewCompanyPage() {
  const navigate = useNavigate();
  const create = useCreateCompany();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/companies"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to companies
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add company</h1>
      </div>
      <CompanyForm
        submitLabel="Save company"
        onCancel={() => navigate('/companies')}
        onSubmit={async (payload) => {
          const company = await create.mutateAsync(payload);
          toast.success('Company added');
          navigate(`/companies/${company.id}`);
        }}
      />
    </div>
  );
}
