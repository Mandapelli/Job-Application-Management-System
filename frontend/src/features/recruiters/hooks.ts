import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APPLICATIONS_KEY, COMPANIES_KEY, RECRUITERS_KEY } from '@/lib/queryKeys';
import { recruitersApi } from './recruiters.api';
import type { RecruiterListParams } from './types';

export function useRecruiters(params: RecruiterListParams) {
  return useQuery({
    queryKey: [...RECRUITERS_KEY, 'list', params],
    queryFn: () => recruitersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useRecruiter(id: string | undefined) {
  return useQuery({
    queryKey: [...RECRUITERS_KEY, 'detail', id],
    queryFn: () => recruitersApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

/** Changing a recruiter changes the contact details on linked applications and the lists on companies. */
function useRecruiterMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [RECRUITERS_KEY, APPLICATIONS_KEY, COMPANIES_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const useCreateRecruiter = () => useRecruiterMutation(recruitersApi.create);
export const useUpdateRecruiter = () => useRecruiterMutation(recruitersApi.update);
export const useDeleteRecruiter = () => useRecruiterMutation(recruitersApi.remove);
