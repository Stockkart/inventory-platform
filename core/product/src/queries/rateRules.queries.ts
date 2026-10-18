import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { isApiError } from '@inventory-platform/api-client';
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
  fetchCapabilities(opts: { force: true }): Promise<unknown>;
}

/**
 * After a save: refetch the rules, then reload the active shop's capabilities so
 * `features.rateRules` reflects the new state. The cached capabilities stay in place
 * until the new ones arrive (other shops' entries are untouched). Capabilities live in
 * a zustand store, not in TanStack Query.
 */
export async function afterRateRulesSaved(
  queryClient: QueryClient,
  capabilities: CapabilitiesRefresher,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: productKeys.rateRules() });
  await capabilities.fetchCapabilities({ force: true });
}

/**
 * After a refused save: a 403 means the edit grant was taken away, so reload the rules
 * and the section turns read-only (`canEdit` false).
 */
export async function afterRateRulesSaveFailed(
  queryClient: QueryClient,
  error: unknown,
): Promise<void> {
  if (isApiError(error) && error.status === 403) {
    await queryClient.invalidateQueries({ queryKey: productKeys.rateRules() });
  }
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

/**
 * Rate rules are shown for the shop unless the API says they are off for its vertical
 * (`enabled: false`, e.g. cafe). Unknown (loading, error) counts as shown.
 */
export function useRateRulesAvailable(): boolean {
  const query = useRateRulesQuery();
  return query.data?.enabled !== false;
}

/**
 * Save the active-shop rate rules, then refresh rules and capabilities. A 403 reloads
 * the rules so the screen turns read-only.
 */
export function useUpdateRateRulesMutation() {
  const queryClient = useQueryClient();
  return useMutation<RateRulesResponse, Error, UpdateRateRulesRequest>({
    mutationFn: (data) => rateRulesApi.update(data),
    onSuccess: () => afterRateRulesSaved(queryClient, useShopCapabilitiesStore.getState()),
    onError: (error) => afterRateRulesSaveFailed(queryClient, error),
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
