import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  PatchPricingDto,
  PricingResponse,
} from '@inventory-platform/types';
import { pricingApi } from '../api/pricing.api';
import { pricingKeys } from './keys';

export function usePricingQuery(
  pricingId: string | undefined,
  options?: Omit<UseQueryOptions<PricingResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: pricingKeys.detail(pricingId ?? ''),
    queryFn: () => pricingApi.getById(pricingId!),
    enabled: Boolean(pricingId),
    ...options,
  });
}

export function useUpdatePricingMutation(
  options?: UseMutationOptions<
    PricingResponse,
    Error,
    { pricingId: string; data: PatchPricingDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pricingId, data }) => pricingApi.update(pricingId, data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: pricingKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export { pricingApi };
