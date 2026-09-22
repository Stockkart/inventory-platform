import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { cartApi, sellCatalogApi } from '@inventory-platform/product/api';
import type { QuotationSummary, SellCatalog } from '@inventory-platform/product/types';
import { cafeKotScreenKeys } from './keys';

/**
 * Reference data the KOT screen reads but does not own, both served by `core/product`.
 *
 * Kept out of `hooks.ts` on purpose: importing `@inventory-platform/product/api` constructs
 * the shared `apiClient` at module load, which reads `localStorage`, so a module that pulls it
 * in cannot be imported by a plain-node test. The tab hooks stay importable without a DOM.
 */

/**
 * The shop's sell catalog, read for the menu the cashier composes from. Owned by
 * `core/product`; this plugin reads it through the package's public `api` entry point.
 */
export function useCafeSellCatalogQuery(): UseQueryResult<SellCatalog> {
  return useQuery<SellCatalog>({
    queryKey: cafeKotScreenKeys.sellCatalog(),
    queryFn: () => sellCatalogApi.get(),
  });
}

/**
 * The cashier's open bills — the Sell screen's own open quotations, which are exactly the
 * bills a flush may append to. `staleTime: 0` on purpose: the picker must not offer a bill
 * that was checked out on another tab of the same browser since the screen loaded.
 */
export function useOpenBillsQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<QuotationSummary[]> {
  return useQuery<QuotationSummary[]>({
    queryKey: cafeKotScreenKeys.openBills(),
    queryFn: async () => (await cartApi.listQuotations()).quotations,
    staleTime: 0,
    enabled: options?.enabled,
  });
}
