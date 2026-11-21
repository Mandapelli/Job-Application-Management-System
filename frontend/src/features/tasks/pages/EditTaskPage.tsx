import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RecordError } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskForm } from '../components/TaskForm';
import { useDeleteTask, useTask, useUpdateTask } from '../hooks';
import { toTaskFormValues } from '../schemas';

export function EditTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useTask(id);
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [deleting, setDeleting] = useState(false);

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
          entity="Task"
          backTo="/tasks"
          backLabel="Back to tasks"
        />
      </Card>
    );
  }

  const task = query.data;
  const completed = task.status === 'COMPLETED';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/tasks" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Edit task</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await update.mutateAsync({ id: task.id, payload: { status: completed ? 'PENDING' : 'COMPLETED' } });
                toast.success(completed ? 'Task reopened' : 'Task completed');
                navigate('/tasks');
              }}
              disabled={update.isPending}
            >
              {completed ? 'Reopen' : 'Mark as completed'}
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <TaskForm
        defaultValues={toTaskFormValues(task)}
        submitLabel="Save changes"
        onCancel={() => navigate('/tasks')}
        onSubmit={async (payload) => {
          await update.mutateAsync({ id: task.id, payload });
          toast.success('Task updated');
          navigate('/tasks');
        }}
      />

      <ConfirmDeleteDialog
        open={deleting}
        title="Delete this task?"
        description={
          <>
            <strong>{task.title}</strong> will be permanently deleted.
          </>
        }
        successMessage="Task deleted"
        onConfirm={() => remove.mutateAsync(task.id)}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/tasks', { replace: true })}
      />
    </div>
  );
}
