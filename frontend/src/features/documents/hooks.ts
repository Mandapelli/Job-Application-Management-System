import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/apiError';
import { DOCUMENTS_KEY } from '@/lib/queryKeys';
import { documentsApi } from './documents.api';
import type { DocumentListParams } from './types';

export function useDocuments(params: DocumentListParams) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, 'list', params],
    queryFn: () => documentsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, 'detail', id],
    queryFn: () => documentsApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

function useDocumentMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  });
}

export const useUploadDocument = () => useDocumentMutation(documentsApi.upload);
export const useUpdateDocument = () => useDocumentMutation(documentsApi.update);
export const useDeleteDocument = () => useDocumentMutation(documentsApi.remove);
export const useAttachDocument = () => useDocumentMutation(documentsApi.attach);
export const useDetachDocument = () => useDocumentMutation(documentsApi.detach);

/** Download with a toast if it fails (e.g. the file is missing on the server). */
export async function downloadDocument(id: string, fileName: string) {
  try {
    await documentsApi.download(id, fileName);
  } catch (error) {
    // For blob responses the error body arrives as a Blob, so a generic message is safest.
    toast.error(getErrorMessage(error, 'Could not download the file'));
  }
}
