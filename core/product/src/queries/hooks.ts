import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  AmendVendorPurchaseInvoicePayload,
  CartResponse,
  PurchaseTaxPreviewRequest,
  StockEntryEstimateResponse,
} from '@inventory-platform/product/types';
import { inventoryApi } from '../api/inventory.api';
import { estimatesApi } from '../api/estimates.api';
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

/** How long typing must pause before the bill preview is asked for again. */
const PURCHASE_TAX_PREVIEW_DEBOUNCE_MS = 400;

/**
 * Tax and totals for the bill on the stock-in screen, from the server's stock-in rules. Null
 * request (no rows) disables it. Requests are debounced while typing, and the last figures stay
 * on screen until the next arrive.
 */
export function usePurchaseTaxPreviewQuery(request: PurchaseTaxPreviewRequest | null) {
  const [debounced, setDebounced] = useState(request);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(request), PURCHASE_TAX_PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [request]);
  return useQuery({
    queryKey: productKeys.purchaseTaxPreview(debounced ?? { items: [] }),
    queryFn: () => inventoryApi.previewPurchaseTotals(debounced as PurchaseTaxPreviewRequest),
    enabled: Boolean(debounced && debounced.items.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Corrects a purchase invoice header; refreshes the invoice lists and details. */
export function useAmendVendorPurchaseInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AmendVendorPurchaseInvoicePayload }) =>
      inventoryApi.amendVendorPurchaseInvoice(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.vendorPurchaseInvoices() }),
  });
}
