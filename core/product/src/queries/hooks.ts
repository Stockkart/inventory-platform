import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { CartResponse } from '@inventory-platform/product/types';
import { estimatesApi } from '../api/estimates.api';
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
