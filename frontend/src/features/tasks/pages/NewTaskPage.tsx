import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TaskForm } from '../components/TaskForm';
import { useCreateTask } from '../hooks';

export function NewTaskPage() {
  const navigate = useNavigate();
  const create = useCreateTask();
  // "Add task" on an application's page links here with ?applicationId=… so it is preselected.
  const applicationId = useSearchParams()[0].get('applicationId');
  const back = applicationId ? `/applications/${applicationId}` : '/tasks';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add task</h1>
      </div>
      <TaskForm
        defaultValues={applicationId ? { applicationId } : undefined}
        submitLabel="Save task"
        onCancel={() => navigate(back)}
        onSubmit={async (payload) => {
          await create.mutateAsync(payload);
          toast.success('Task added');
          navigate(back);
        }}
      />
    </div>
  );
}
