import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useShopCapabilitiesStore } from '@inventory-platform/session';
import { rateRulesApi } from '../api/rateRules.api';
import type {
  RateRulesPreviewRequest,
  RateRulesPreviewResponse,
  RateRulesResponse,
  UpdateRateRulesRequest,
} from '../model/rateRules.types';
import { productKeys } from './keys';

/** The part of `useShopCapabilitiesStore` that a rate rules save needs to refresh. */
export interface CapabilitiesRefresher {
  clear(): void;
  fetchCapabilities(): Promise<unknown>;
}

/**
 * After a save: refetch the rules, then drop the per-shop capabilities cache and
 * reload it so `features.rateRules` reflects the new state. Capabilities live in
 * a zustand store, not in TanStack Query.
 */
export async function afterRateRulesSaved(
  queryClient: QueryClient,
  capabilities: CapabilitiesRefresher,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: productKeys.rateRules() });
  capabilities.clear();
  await capabilities.fetchCapabilities();
}

/** Active-shop rate rules. */
export function useRateRulesQuery(options?: { enabled?: boolean }) {
  return useQuery<RateRulesResponse>({
    queryKey: productKeys.rateRules(),
    queryFn: rateRulesApi.get,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

/** Save the active-shop rate rules, then refresh rules and capabilities. */
export function useUpdateRateRulesMutation() {
  const queryClient = useQueryClient();
  return useMutation<RateRulesResponse, Error, UpdateRateRulesRequest>({
    mutationFn: (data) => rateRulesApi.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(productKeys.rateRules(), data);
      return afterRateRulesSaved(queryClient, useShopCapabilitiesStore.getState());
    },
  });
}

/**
 * Server-computed preview of rates for raw cost inputs. The previous result
 * stays on screen while a new one loads.
 */
export function useRateRulesPreviewQuery(request: RateRulesPreviewRequest, enabled = true) {
  return useQuery<RateRulesPreviewResponse>({
    queryKey: productKeys.rateRulesPreview(request),
    queryFn: () => rateRulesApi.preview(request),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
}
