import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import {
  companyFormSchema,
  emptyCompanyValues,
  toCompanyPayload,
  type CompanyFormValues,
} from '../schemas';
import type { CompanyPayload } from '../types';

export function CompanyForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<CompanyFormValues>;
  submitLabel: string;
  onSubmit: (payload: CompanyPayload) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: { ...emptyCompanyValues, ...defaultValues },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toCompanyPayload(values));
    } catch (error) {
      // e.g. "You already have a company with this name" shows as a toast; field errors show inline.
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save company'));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <FormField label="Company name *" htmlFor="name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Website" htmlFor="website" error={errors.website?.message}>
            <Input id="website" placeholder="https://" aria-invalid={!!errors.website} {...register('website')} />
          </FormField>
          <FormField label="Industry" htmlFor="industry" error={errors.industry?.message}>
            <Input id="industry" placeholder="e.g. Software" {...register('industry')} />
          </FormField>
          <FormField label="Location" htmlFor="location" error={errors.location?.message}>
            <Input id="location" placeholder="e.g. Berlin" {...register('location')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={4} placeholder="Culture, tech stack, contacts…" {...register('notes')} />
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
