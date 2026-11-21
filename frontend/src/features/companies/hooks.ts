import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { APPLICATIONS_KEY, COMPANIES_KEY, RECRUITERS_KEY } from '@/lib/queryKeys';
import { companiesApi } from './companies.api';
import type { CompanyListParams } from './types';

export { COMPANIES_KEY };

export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: [...COMPANIES_KEY, 'list', params],
    queryFn: () => companiesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: [...COMPANIES_KEY, 'detail', id],
    queryFn: () => companiesApi.get(id!),
    enabled: !!id,
    retry: (count, error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 1,
  });
}

/**
 * Refreshes companies after a change. Applications are refreshed too, because renaming or
 * deleting a company changes what its applications show.
 */
function useCompanyMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [COMPANIES_KEY, APPLICATIONS_KEY, RECRUITERS_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const useCreateCompany = () => useCompanyMutation(companiesApi.create);
export const useUpdateCompany = () => useCompanyMutation(companiesApi.update);
export const useDeleteCompany = () => useCompanyMutation(companiesApi.remove);
