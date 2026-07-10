import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CreateCreditEntryDto,
  CreditAccountResponse,
  CreditEntriesPageResponse,
  CreditEntryResponse,
} from '@inventory-platform/credit/types';
import { creditApi } from '../api/credit.api';
import { creditKeys } from './keys';

export function useCreditAccountsQuery(
  options?: Omit<UseQueryOptions<CreditAccountResponse[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: creditKeys.accounts(),
    queryFn: () => creditApi.accounts(),
    ...options,
  });
}

export function useCreditEntriesQuery(
  accountId: string | null | undefined,
  page = 0,
  size = 30,
  options?: Omit<UseQueryOptions<CreditEntriesPageResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: creditKeys.entries(accountId ?? '', page, size),
    queryFn: () => creditApi.entries(accountId!, page, size),
    enabled: Boolean(accountId),
    ...options,
  });
}

export function useChargeMutation(
  options?: UseMutationOptions<CreditEntryResponse, Error, CreateCreditEntryDto>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => creditApi.charge(body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: creditKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useSettlementMutation(
  options?: UseMutationOptions<CreditEntryResponse, Error, CreateCreditEntryDto>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => creditApi.settlement(body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: creditKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
