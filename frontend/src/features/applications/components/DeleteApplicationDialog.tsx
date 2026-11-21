import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/apiError';
import { useDeleteApplication } from '../hooks';

export interface DeleteTarget {
  id: string;
  companyName: string;
  jobTitle: string;
}

export function DeleteApplicationDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const remove = useDeleteApplication();

  const confirm = async () => {
    if (!target) return;
    try {
      await remove.mutateAsync(target.id);
      toast.success('Application deleted');
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete application')); // dialog stays open so the user can retry
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this application?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{target?.jobTitle}</strong> at <strong>{target?.companyName}</strong> and its status
            history will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={remove.isPending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
