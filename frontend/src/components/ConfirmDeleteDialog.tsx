import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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

/** Reusable "are you sure?" dialog. Stays open with a toast if the delete fails, so the user can retry. */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  successMessage,
  onConfirm,
  onClose,
  onDeleted,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  successMessage: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      toast.success(successMessage);
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
