import { Download, FileText, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from '@/components/StateMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { formatBytes } from '@/lib/format';
import { downloadDocument, useAttachDocument, useDetachDocument, useDocuments } from '../hooks';
import { TypeBadge } from './TypeBadge';

/** The documents attached to one application, with attach / detach, shown on its details page. */
export function ApplicationDocuments({ applicationId }: { applicationId: string }) {
  const attached = useDocuments({ page: 1, limit: 50, applicationId, sortBy: 'createdAt', sortOrder: 'desc' });
  // Up to 100 of the newest documents can be picked from (the API maximum per page).
  const all = useDocuments({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const attach = useAttachDocument();
  const detach = useDetachDocument();

  const attachedIds = new Set(attached.data?.items.map((d) => d.id));
  const available = (all.data?.items ?? []).filter((d) => !attachedIds.has(d.id));

  const onAttach = async (id: string) => {
    try {
      await attach.mutateAsync({ id, applicationId });
      toast.success('Document attached');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not attach the document'));
    }
  };
  const onDetach = async (id: string) => {
    try {
      await detach.mutateAsync({ id, applicationId });
      toast.success('Document detached');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not detach the document'));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Documents</CardTitle>
        <Button asChild size="sm" variant="outline">
          <Link to={`/documents/new?applicationId=${applicationId}`}>
            <Plus className="h-4 w-4" /> Upload new
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {attached.isPending ? (
          <Skeleton className="h-14 w-full" />
        ) : attached.isError ? (
          <ErrorState message={getErrorMessage(attached.error)} onRetry={() => void attached.refetch()} />
        ) : attached.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents attached to this application yet.</p>
        ) : (
          <ul className="divide-y">
            {attached.data.items.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(d.sizeBytes)}</p>
                  </div>
                  <TypeBadge type={d.type} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" title="Download" aria-label={`Download ${d.name}`} onClick={() => void downloadDocument(d.id, d.fileName)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Detach from this application"
                    aria-label={`Detach ${d.name}`}
                    disabled={detach.isPending}
                    onClick={() => void onDetach(d.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {available.length > 0 && (
          <Select value="" onValueChange={(id) => void onAttach(id)} disabled={attach.isPending}>
            <SelectTrigger aria-label="Attach an existing document">
              <SelectValue placeholder="Attach an existing document…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
