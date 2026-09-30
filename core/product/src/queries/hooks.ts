import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { CartResponse, StockEntryEstimateResponse } from '@inventory-platform/product/types';
import { estimatesApi } from '../api/estimates.api';
import { isBridgeUp, type BridgeHealth } from '../lib/printBridge';
import { stockEntryEstimatesApi } from '../api/stockEntryEstimates.api';
import { productKeys } from './keys';

export { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
export { cartApi } from '../api/cart.api';
export { checkoutApi } from '../api/checkout.api';
export { shopMenuApi } from '../api/menu.api';
export { sellCatalogApi } from '../api/sell-catalog.api';
export { productKeys } from './keys';

export function useEstimateDetailQuery(
  purchaseId: string | null | undefined,
  options?: Omit<UseQueryOptions<CartResponse>, 'queryKey' | 'queryFn'>,
) {
  const id = purchaseId?.trim() ?? '';
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    ...options,
    queryKey: productKeys.estimateDetail(id),
    queryFn: () => estimatesApi.get(id),
    enabled: Boolean(id) && extraEnabled,
    staleTime: 60_000,
  });
}

export function useStockEntryEstimateDetailQuery(
  id: string | null | undefined,
  options?: Omit<UseQueryOptions<StockEntryEstimateResponse>, 'queryKey' | 'queryFn'>,
) {
  const estimateId = id?.trim() ?? '';
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    ...options,
    queryKey: productKeys.stockEntryEstimateDetail(estimateId),
    queryFn: () => stockEntryEstimatesApi.get(estimateId),
    enabled: Boolean(estimateId) && extraEnabled,
    staleTime: 30_000,
  });
}

/**
 * Probes the local dot matrix print bridge. It is local state, not server state, so it is
 * re-probed every time `enabled` turns on (the print modal opening) and never retried:
 * `isBridgeUp` already times out and resolves to null on any failure.
 */
export function usePrintBridgeHealthQuery(enabled: boolean) {
  return useQuery<BridgeHealth | null>({
    queryKey: productKeys.printBridgeHealth(),
    queryFn: () => isBridgeUp(),
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
