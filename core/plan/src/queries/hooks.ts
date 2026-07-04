import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CreatePlanCheckoutRequest,
  PlanCheckoutResponse,
  PlanResponse,
  PlanTransactionResponse,
  ShopPlanStatusResponse,
  VerifyPlanPaymentRequest,
  VerifyPlanPaymentResponse,
} from '@inventory-platform/types';
import { plansApi } from '../api/plans.api';
import { planKeys } from './keys';

export function usePlansQuery(
  options?: Omit<UseQueryOptions<PlanResponse[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: () => plansApi.list(),
    ...options,
  });
}

export function usePlanQuery(
  planId: string | null | undefined,
  options?: Omit<UseQueryOptions<PlanResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: planKeys.detail(planId ?? ''),
    queryFn: () => plansApi.getById(planId!),
    enabled: Boolean(planId),
    ...options,
  });
}

export function useShopPlanStatusQuery(
  options?: Omit<UseQueryOptions<ShopPlanStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: planKeys.shopStatus(),
    queryFn: () => plansApi.getShopStatus(),
    ...options,
  });
}

export function usePlanTransactionsQuery(
  options?: Omit<
    UseQueryOptions<PlanTransactionResponse[]>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: planKeys.transactions(),
    queryFn: () => plansApi.listTransactions(),
    ...options,
  });
}

export function useCreatePlanCheckoutMutation(
  options?: UseMutationOptions<
    PlanCheckoutResponse,
    Error,
    CreatePlanCheckoutRequest
  >
) {
  return useMutation({
    mutationFn: (data) => plansApi.createCheckout(data),
    ...options,
  });
}

export function useVerifyPlanPaymentMutation(
  options?: UseMutationOptions<
    VerifyPlanPaymentResponse,
    Error,
    VerifyPlanPaymentRequest
  >
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
