import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApplications } from '@/features/applications/hooks';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { emptyTaskValues, NO_APPLICATION, taskFormSchema, toTaskPayload, type TaskFormValues } from '../schemas';
import { PRIORITIES, PRIORITY_LABELS, type TaskPayload } from '../types';

export function TaskForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<TaskFormValues>;
  submitLabel: string;
  onSubmit: (payload: TaskPayload) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { ...emptyTaskValues, ...defaultValues },
  });

  // Up to 100 most recent applications are offered (the API maximum per page).
  const applications = useApplications({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toTaskPayload(values));
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save task'));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Title *" htmlFor="title" error={errors.title?.message}>
              <Input id="title" placeholder="e.g. Follow up with the recruiter" aria-invalid={!!errors.title} {...register('title')} />
            </FormField>
          </div>
          <FormField label="Due date and time" htmlFor="dueAt" error={errors.dueAt?.message}>
            <Input id="dueAt" type="datetime-local" aria-invalid={!!errors.dueAt} {...register('dueAt')} />
          </FormField>
          <FormField label="Priority" htmlFor="priority">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Related application" htmlFor="applicationId" error={errors.applicationId?.message}>
              <Controller
                control={control}
                name="applicationId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="applicationId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_APPLICATION}>None (general task)</SelectItem>
                      {applications.data?.items.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.jobTitle} — {a.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Details" htmlFor="description" error={errors.description?.message}>
              <Textarea id="description" rows={4} placeholder="What needs to be done?" {...register('description')} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
