import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Download, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RecordError } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { formatBytes, formatDate } from '@/lib/format';
import { downloadDocument, useDeleteDocument, useDocument, useUpdateDocument } from '../hooks';
import { editFormSchema, toEditFormValues, type EditFormValues } from '../schemas';
import { DOCUMENT_TYPES, TYPE_LABELS, type DocumentItem } from '../types';

function EditForm({ doc }: { doc: DocumentItem }) {
  const navigate = useNavigate();
  const update = useUpdateDocument();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({ resolver: zodResolver(editFormSchema), defaultValues: toEditFormValues(doc) });

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: doc.id,
        payload: { name: values.name, type: values.type, description: values.description || null },
      });
      toast.success('Document updated');
      navigate('/documents');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not save changes'));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <FormField label="Display name *" htmlFor="name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
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
              <Textarea id="description" rows={3} {...register('description')} />
            </FormField>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate('/documents')} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function EditDocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useDocument(id);
  const remove = useDeleteDocument();
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
        <RecordError error={query.error} onRetry={() => void query.refetch()} entity="Document" backTo="/documents" backLabel="Back to documents" />
      </Card>
    );
  }

  const doc = query.data;
  const applications = doc.applications ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/documents" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to documents
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">Edit document</h1>
            <p className="text-sm text-muted-foreground">
              {doc.fileName} · {formatBytes(doc.sizeBytes)} · uploaded {formatDate(doc.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void downloadDocument(doc.id, doc.fileName)}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <EditForm doc={doc} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attached to ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not attached to any application. Attach it from an application's page.</p>
          ) : (
            <ul className="divide-y">
              {applications.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <Link to={`/applications/${a.id}`} className="font-medium hover:text-primary hover:underline">
                    {a.jobTitle}
                  </Link>
                  <span className="text-muted-foreground"> — {a.companyName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleting}
        title="Delete this document?"
        description={
          <>
            <strong>{doc.name}</strong> and its file will be permanently deleted
            {applications.length ? ` and removed from ${applications.length} application(s)` : ''}. The applications themselves are
            not affected.
          </>
        }
        successMessage="Document deleted"
        onConfirm={() => remove.mutateAsync(doc.id)}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/documents', { replace: true })}
      />
    </div>
  );
}
