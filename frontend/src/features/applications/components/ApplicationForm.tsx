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
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { useCompanies } from '@/features/companies/hooks';
import { useRecruiters } from '@/features/recruiters/hooks';
import {
  applicationFormSchema,
  emptyFormValues,
  NO_LINK,
  toPayload,
  type ApplicationFormValues,
} from '../schemas';
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  STATUSES,
  STATUS_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type ApplicationPayload,
} from '../types';

interface Props {
  /** "edit" hides the status field: status changes go through their own endpoint so history is recorded. */
  mode: 'create' | 'edit';
  defaultValues?: Partial<ApplicationFormValues>;
  submitLabel: string;
  onSubmit: (payload: ApplicationPayload) => Promise<unknown>;
  onCancel: () => void;
}

function SelectInput({
  control,
  name,
  id,
  options,
}: {
  control: Control<ApplicationFormValues>;
  name: 'employmentType' | 'workMode' | 'status';
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
            <SelectValue />
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

export function ApplicationForm({ mode, defaultValues, submitLabel, onSubmit, onCancel }: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: { ...emptyFormValues, ...defaultValues },
  });

  // Dropdown choices: up to 100 each (the API maximum per page).
  const pickerParams = { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' } as const;
  const companies = useCompanies(pickerParams);
  const recruiters = useRecruiters(pickerParams);
  const companyLinked = watch('companyId') !== NO_LINK;
  const recruiterLinked = watch('recruiterId') !== NO_LINK;

  // A linked company/recruiter is the source of truth, so its details are copied in and the fields lock.
  // Choosing "None" unlocks them again, keeping the last values so nothing is lost.
  const pickCompany = (id: string) => {
    setValue('companyId', id);
    const company = companies.data?.items.find((c) => c.id === id);
    if (company) setValue('companyName', company.name, { shouldValidate: true });
  };
  const pickRecruiter = (id: string) => {
    setValue('recruiterId', id);
    const r = recruiters.data?.items.find((x) => x.id === id);
    if (r) {
      setValue('recruiterName', r.name);
      setValue('recruiterEmail', r.email ?? '', { shouldValidate: true });
      setValue('recruiterPhone', r.phone ?? '');
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toPayload(values, mode === 'create'));
    } catch (error) {
      // Server-side field errors appear under their fields; anything else becomes a toast.
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save application'));
    }
  });

  const err = (name: keyof ApplicationFormValues) => errors[name]?.message;
  const bad = (name: keyof ApplicationFormValues) => !!errors[name];

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Saved company" htmlFor="companyId">
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={pickCompany}>
                  <SelectTrigger id="companyId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LINK}>None (type a name)</SelectItem>
                    {companies.data?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Company *" htmlFor="companyName" error={err('companyName')}>
            <Input
              id="companyName"
              readOnly={companyLinked}
              className={companyLinked ? 'bg-muted' : undefined}
              aria-invalid={bad('companyName')}
              {...register('companyName')}
            />
          </FormField>
          <FormField label="Job title *" htmlFor="jobTitle" error={err('jobTitle')}>
            <Input id="jobTitle" aria-invalid={bad('jobTitle')} {...register('jobTitle')} />
          </FormField>
          <FormField label="Location" htmlFor="location" error={err('location')}>
            <Input id="location" placeholder="e.g. Berlin" {...register('location')} />
          </FormField>
          <FormField label="Job posting URL" htmlFor="jobUrl" error={err('jobUrl')}>
            <Input id="jobUrl" placeholder="https://" aria-invalid={bad('jobUrl')} {...register('jobUrl')} />
          </FormField>
          <FormField label="Employment type" htmlFor="employmentType">
            <SelectInput
              control={control}
              name="employmentType"
              id="employmentType"
              options={[
                { value: 'NONE', label: 'Not specified' },
                ...EMPLOYMENT_TYPES.map((t) => ({ value: t, label: EMPLOYMENT_LABELS[t] })),
              ]}
            />
          </FormField>
          <FormField label="Work mode" htmlFor="workMode">
            <SelectInput
              control={control}
              name="workMode"
              id="workMode"
              options={[
                { value: 'NONE', label: 'Not specified' },
                ...WORK_MODES.map((m) => ({ value: m, label: WORK_MODE_LABELS[m] })),
              ]}
            />
          </FormField>
          <FormField label="Applied date" htmlFor="appliedDate" error={err('appliedDate')}>
            <Input id="appliedDate" type="date" aria-invalid={bad('appliedDate')} {...register('appliedDate')} />
          </FormField>
          {mode === 'create' && (
            <FormField label="Status" htmlFor="status">
              <SelectInput
                control={control}
                name="status"
                id="status"
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Minimum" htmlFor="salaryMin" error={err('salaryMin')}>
            <Input id="salaryMin" inputMode="numeric" aria-invalid={bad('salaryMin')} {...register('salaryMin')} />
          </FormField>
          <FormField label="Maximum" htmlFor="salaryMax" error={err('salaryMax')}>
            <Input id="salaryMax" inputMode="numeric" aria-invalid={bad('salaryMax')} {...register('salaryMax')} />
          </FormField>
          <FormField label="Currency" htmlFor="salaryCurrency" error={err('salaryCurrency')}>
            <Input id="salaryCurrency" maxLength={3} aria-invalid={bad('salaryCurrency')} {...register('salaryCurrency')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruiter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <FormField label="Saved recruiter" htmlFor="recruiterId">
              <Controller
                control={control}
                name="recruiterId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={pickRecruiter}>
                    <SelectTrigger id="recruiterId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LINK}>None (type details)</SelectItem>
                      {recruiters.data?.items.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                          {r.company ? ` (${r.company.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <FormField label="Name" htmlFor="recruiterName" error={err('recruiterName')}>
            <Input
              id="recruiterName"
              readOnly={recruiterLinked}
              className={recruiterLinked ? 'bg-muted' : undefined}
              {...register('recruiterName')}
            />
          </FormField>
          <FormField label="Email" htmlFor="recruiterEmail" error={err('recruiterEmail')}>
            <Input
              id="recruiterEmail"
              type="email"
              readOnly={recruiterLinked}
              className={recruiterLinked ? 'bg-muted' : undefined}
              aria-invalid={bad('recruiterEmail')}
              {...register('recruiterEmail')}
            />
          </FormField>
          <FormField label="Phone" htmlFor="recruiterPhone" error={err('recruiterPhone')}>
            <Input
              id="recruiterPhone"
              type="tel"
              readOnly={recruiterLinked}
              className={recruiterLinked ? 'bg-muted' : undefined}
              {...register('recruiterPhone')}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description and notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Job description" htmlFor="jobDescription" error={err('jobDescription')}>
            <Textarea id="jobDescription" rows={5} {...register('jobDescription')} />
          </FormField>
          <FormField label="Notes" htmlFor="notes" error={err('notes')}>
            <Textarea id="notes" rows={4} placeholder="Referral, interview prep, follow-ups…" {...register('notes')} />
          </FormField>
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
