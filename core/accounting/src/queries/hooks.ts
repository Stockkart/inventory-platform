import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  AccountResponse,
  CreateAccountRequest,
  CreateJournalEntryRequest,
  JournalEntriesPageResponse,
  JournalEntryResponse,
  ReverseJournalRequest,
  UpdateAccountRequest,
} from '@inventory-platform/types';
import {
  accountingApi,
  type JournalListParams,
  type LedgerParams,
  type PartiesListParams,
  type PartyStatementParams,
} from '../api/accounting.api';
import { accountingKeys } from './keys';

export function useAccountsQuery(
  options?: Omit<UseQueryOptions<AccountResponse[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: accountingKeys.accounts(),
    queryFn: () => accountingApi.accounts(),
    ...options,
  });
}

export function useJournalsQuery(
  params: JournalListParams = {},
  options?: Omit<
    UseQueryOptions<JournalEntriesPageResponse>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.journals(params),
    queryFn: () => accountingApi.journals(params),
    ...options,
  });
}

export function useJournalQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<JournalEntryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: accountingKeys.journal(id ?? ''),
    queryFn: () => accountingApi.journal(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export function useLedgerQuery(
  accountId: string | undefined,
  params: LedgerParams = {},
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.ledger>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.ledger(accountId ?? '', params),
    queryFn: () => accountingApi.ledger(accountId!, params),
    enabled: Boolean(accountId),
    ...options,
  });
}

export function usePartiesQuery(
  params: PartiesListParams,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.parties>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.parties(params),
    queryFn: () => accountingApi.parties(params),
    ...options,
  });
}

export function usePartyStatementQuery(
  type: PartiesListParams['type'],
  partyRefId: string | undefined,
  params: PartyStatementParams = {},
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.partyStatement>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.partyStatement(type, partyRefId ?? '', params),
    queryFn: () => accountingApi.partyStatement(type, partyRefId!, params),
    enabled: Boolean(partyRefId),
    ...options,
  });
}

export function useTrialBalanceQuery(
  asOf?: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.trialBalance>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.trialBalance(asOf),
    queryFn: () => accountingApi.trialBalance(asOf),
    ...options,
  });
}

export function useProfitAndLossQuery(
  from: string,
  to: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.profitAndLoss>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.profitAndLoss(from, to),
    queryFn: () => accountingApi.profitAndLoss(from, to),
    enabled: Boolean(from && to),
    ...options,
  });
}

export function useBalanceSheetQuery(
  asOf?: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof accountingApi.balanceSheet>>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.balanceSheet(asOf),
    queryFn: () => accountingApi.balanceSheet(asOf),
    ...options,
  });
}

export function useOpeningBalanceStatusQuery(
  options?: Omit<
    UseQueryOptions<JournalEntryResponse | null>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: accountingKeys.openingBalanceStatus(),
    queryFn: () => accountingApi.openingBalanceStatus(),
    ...options,
  });
}

export function useCreateAccountMutation(
  options?: UseMutationOptions<AccountResponse, Error, CreateAccountRequest>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => accountingApi.createAccount(body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateAccountMutation(
  options?: UseMutationOptions<
    AccountResponse,
    Error,
    { id: string; body: UpdateAccountRequest }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => accountingApi.updateAccount(id, body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.accounts() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useCreateManualJournalMutation(
  options?: UseMutationOptions<JournalEntryResponse, Error, CreateJournalEntryRequest>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => accountingApi.createManualJournal(body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useReverseJournalMutation(
  options?: UseMutationOptions<
    JournalEntryResponse,
    Error,
    { id: string; body?: ReverseJournalRequest }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => accountingApi.reverseJournal(id, body),
    onSuccess: (data, variables, ...rest) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      void queryClient.setQueryData(accountingKeys.journal(variables.id), data);
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function usePostOpeningBalanceMutation(
  options?: UseMutationOptions<
    JournalEntryResponse,
    Error,
    Parameters<typeof accountingApi.postOpeningBalance>[0]
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => accountingApi.postOpeningBalance(body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useBackfillMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof accountingApi.backfill>>,
    Error,
    Parameters<typeof accountingApi.backfill>[0]
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts) => accountingApi.backfill(opts),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
