import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RecordError } from '@/components/StateMessages';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyForm } from '../components/CompanyForm';
import { useCompany, useUpdateCompany } from '../hooks';
import { toCompanyFormValues } from '../schemas';

export function EditCompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCompany(id);
  const update = useUpdateCompany();

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
          entity="Company"
          backTo="/companies"
          backLabel="Back to companies"
        />
      </Card>
    );
  }

  const company = query.data;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`/companies/${company.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit company</h1>
      </div>
      <CompanyForm
        defaultValues={toCompanyFormValues(company)}
        submitLabel="Save changes"
        onCancel={() => navigate(`/companies/${company.id}`)}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: company.id, payload });
          toast.success('Company updated');
          navigate(`/companies/${company.id}`);
        }}
      />
    </div>
  );
}
