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
import { useCompanies } from '@/features/companies/hooks';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import {
  emptyRecruiterValues,
  NO_COMPANY,
  recruiterFormSchema,
  toRecruiterPayload,
  type RecruiterFormValues,
} from '../schemas';
import type { RecruiterPayload } from '../types';

export function RecruiterForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<RecruiterFormValues>;
  submitLabel: string;
  onSubmit: (payload: RecruiterPayload) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecruiterFormValues>({
    resolver: zodResolver(recruiterFormSchema),
    defaultValues: { ...emptyRecruiterValues, ...defaultValues },
  });

  // Up to 100 companies are offered in the dropdown (the API maximum per page).
  const companies = useCompanies({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toRecruiterPayload(values));
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save recruiter'));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <FormField label="Name *" htmlFor="name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Company" htmlFor="companyId" error={errors.companyId?.message}>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="companyId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COMPANY}>No company</SelectItem>
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
          <FormField label="Job title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="e.g. Talent Partner" {...register('title')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...register('phone')} />
          </FormField>
          <FormField label="LinkedIn URL" htmlFor="linkedinUrl" error={errors.linkedinUrl?.message}>
            <Input id="linkedinUrl" placeholder="https://" aria-invalid={!!errors.linkedinUrl} {...register('linkedinUrl')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={4} placeholder="How you met, best time to call…" {...register('notes')} />
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
