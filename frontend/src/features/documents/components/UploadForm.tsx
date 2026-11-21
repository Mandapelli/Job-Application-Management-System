import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { uploadFormSchema, type UploadFormValues } from '../schemas';
import { DOCUMENT_TYPES, MAX_UPLOAD_MB, TYPE_LABELS, type UploadInput } from '../types';

export function UploadForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: UploadInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { name: '', type: 'RESUME', description: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ file: values.file[0]!, name: values.name, type: values.type, description: values.description });
    } catch (error) {
      // The server re-checks the real file content, so it can still reject a file that looked fine here.
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Upload failed'));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="File *" htmlFor="file" error={errors.file?.message as string | undefined}>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                aria-invalid={!!errors.file}
                className="h-auto cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                {...register('file')}
              />
            </FormField>
            <p className="mt-1.5 text-xs text-muted-foreground">PDF, DOC or DOCX, up to {MAX_UPLOAD_MB} MB.</p>
          </div>
          <FormField label="Display name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="Defaults to the file name" {...register('name')} />
          </FormField>
          <FormField label="Type" htmlFor="type">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="description" error={errors.description?.message}>
              <Textarea id="description" rows={3} placeholder="e.g. Backend-focused version" {...register('description')} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isSubmitting ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
    </form>
  );
}
