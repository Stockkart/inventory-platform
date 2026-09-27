import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CampaignResponse,
  CreatePlanCheckoutRequest,
  PlanCheckoutResponse,
  PlanResponse,
  PlanTransactionResponse,
  QuoteRequest,
  QuoteResponse,
  ShopPlanStatusResponse,
  VerifyPlanPaymentRequest,
  VerifyPlanPaymentResponse,
} from '@inventory-platform/plan/types';
import { plansApi } from '../api/plans.api';
import { planKeys } from './keys';

export function usePlansQuery(
  options?: Omit<UseQueryOptions<PlanResponse[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: () => plansApi.list(),
    ...options,
  });
}

export function usePlanQuery(
  planId: string | null | undefined,
  options?: Omit<UseQueryOptions<PlanResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: planKeys.detail(planId ?? ''),
    queryFn: () => plansApi.getById(planId!),
    enabled: Boolean(planId),
    ...options,
  });
}

export function useShopPlanStatusQuery(
  options?: Omit<UseQueryOptions<ShopPlanStatusResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: planKeys.shopStatus(),
    queryFn: () => plansApi.getShopStatus(),
    ...options,
  });
}

export function usePlanTransactionsQuery(
  options?: Omit<UseQueryOptions<PlanTransactionResponse[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: planKeys.transactions(),
    queryFn: () => plansApi.listTransactions(),
    ...options,
  });
}

/** Server-priced cart. Pass null until the cart has a plan. */
export function usePlanQuoteQuery(
  request: QuoteRequest | null,
  options?: Omit<UseQueryOptions<QuoteResponse>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: request ? planKeys.quote(request) : [...planKeys.all, 'quote', null],
    queryFn: () => {
      if (!request) throw new Error('Quote requested without a cart');
      return plansApi.quote(request);
    },
    enabled: request != null,
    ...options,
  });
}

/** A failed fetch simply hides the banner; it never blocks the page. */
export function useActiveCampaignQuery(
  options?: Omit<UseQueryOptions<CampaignResponse | null>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: planKeys.activeCampaign(),
    queryFn: () => plansApi.getActiveCampaign(),
    staleTime: 60_000,
    retry: 1,
    ...options,
  });
}

export function useCreatePlanCheckoutMutation(
  options?: UseMutationOptions<PlanCheckoutResponse, Error, CreatePlanCheckoutRequest>,
) {
  return useMutation({
    mutationFn: (data) => plansApi.createCheckout(data),
    ...options,
  });
}

export function useVerifyPlanPaymentMutation(
  options?: UseMutationOptions<VerifyPlanPaymentResponse, Error, VerifyPlanPaymentRequest>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => plansApi.verifyPayment(data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
