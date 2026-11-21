import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { sellCatalogApi } from '@inventory-platform/product/api';
import type { InventoryItem } from '@inventory-platform/product/types';
import { cafeMenuKeys } from './keys';

/**
 * The sell-direct lots Menu admin can place in a section, and the price and stock a placed row
 * shows. Read from the sell catalog so admin and the Sell screen agree on what is sellable.
 */
export function useSellDirectLotsQuery(): UseQueryResult<InventoryItem[], unknown> {
  return useQuery<InventoryItem[], unknown>({
    queryKey: cafeMenuKeys.sellDirectLots(),
    queryFn: async () => (await sellCatalogApi.get()).directStock ?? [],
  });
}
