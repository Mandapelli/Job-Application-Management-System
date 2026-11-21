import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApplications } from '@/features/applications/hooks';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import {
  emptyInterviewValues,
  interviewFormSchema,
  toInterviewPayload,
  type InterviewFormValues,
} from '../schemas';
import {
  INTERVIEW_RESULTS,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPES,
  RESULT_LABELS,
  TYPE_LABELS,
  type InterviewPayload,
} from '../types';

interface Props {
  /** "edit" locks the application: an interview always stays with the application it was created for. */
  mode: 'create' | 'edit';
  defaultValues?: Partial<InterviewFormValues>;
  /** In edit mode, the application's name is shown instead of a picker. */
  applicationLabel?: string;
  submitLabel: string;
  onSubmit: (payload: InterviewPayload) => Promise<unknown>;
  onCancel: () => void;
}

function EnumSelect({
  control,
  name,
  id,
  options,
}: {
  control: Control<InterviewFormValues>;
  name: 'type' | 'status' | 'result' | 'applicationId';
  id: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function InterviewForm({ mode, defaultValues, applicationLabel, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: { ...emptyInterviewValues, ...defaultValues },
  });

  // Up to 100 most recent applications are offered (the API maximum per page).
  const applications = useApplications(
    { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
    mode === 'create',
  );

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toInterviewPayload(values, mode === 'create'));
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save interview'));
    }
  });

  const err = (name: keyof InterviewFormValues) => errors[name]?.message;
  const bad = (name: keyof InterviewFormValues) => !!errors[name];

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Application *" htmlFor="applicationId" error={err('applicationId')}>
              {mode === 'create' ? (
                <EnumSelect
                  control={control}
                  name="applicationId"
                  id="applicationId"
                  options={(applications.data?.items ?? []).map((a) => ({
                    value: a.id,
                    label: `${a.jobTitle} — ${a.companyName}`,
                  }))}
                />
              ) : (
                <Input id="applicationId" value={applicationLabel ?? ''} readOnly className="bg-muted" />
              )}
            </FormField>
          </div>
          <FormField label="Date and time *" htmlFor="scheduledAt" error={err('scheduledAt')}>
            <Input id="scheduledAt" type="datetime-local" aria-invalid={bad('scheduledAt')} {...register('scheduledAt')} />
          </FormField>
          <FormField label="Duration (minutes)" htmlFor="durationMinutes" error={err('durationMinutes')}>
            <Input id="durationMinutes" inputMode="numeric" aria-invalid={bad('durationMinutes')} {...register('durationMinutes')} />
          </FormField>
          <FormField label="Round" htmlFor="round" error={err('round')}>
            <Input id="round" inputMode="numeric" aria-invalid={bad('round')} {...register('round')} />
          </FormField>
          <FormField label="Type" htmlFor="type">
            <EnumSelect
              control={control}
              name="type"
              id="type"
              options={INTERVIEW_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            />
          </FormField>
          <FormField label="Meeting link" htmlFor="meetingUrl" error={err('meetingUrl')}>
            <Input id="meetingUrl" placeholder="https://" aria-invalid={bad('meetingUrl')} {...register('meetingUrl')} />
          </FormField>
          <FormField label="Location" htmlFor="location" error={err('location')}>
            <Input id="location" placeholder="Office address or room" {...register('location')} />
          </FormField>
          <FormField label="Interviewer" htmlFor="interviewerName" error={err('interviewerName')}>
            <Input id="interviewerName" {...register('interviewerName')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcome</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status" htmlFor="status">
            <EnumSelect
              control={control}
              name="status"
              id="status"
              options={INTERVIEW_STATUSES.map((s) => ({ value: s, label: INTERVIEW_STATUS_LABELS[s] }))}
            />
          </FormField>
          <FormField label="Result" htmlFor="result">
            <EnumSelect
              control={control}
              name="result"
              id="result"
              options={INTERVIEW_RESULTS.map((r) => ({ value: r, label: RESULT_LABELS[r] }))}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Feedback" htmlFor="feedback" error={err('feedback')}>
              <Textarea id="feedback" rows={4} placeholder="How did it go? What did they ask?" {...register('feedback')} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Preparation notes" htmlFor="notes" error={err('notes')}>
              <Textarea id="notes" rows={3} placeholder="Topics to review, questions to ask…" {...register('notes')} />
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
