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
  CreatePrintJobRequest,
  HsnGstRates,
  PrintJobPlan,
  PrintOutcomeResult,
  PurchaseTaxPreviewRequest,
  ReportPrintOutcomeRequest,
  StockEntryEstimateResponse,
} from '@inventory-platform/product/types';
import { inventoryApi } from '../api/inventory.api';
import { estimatesApi } from '../api/estimates.api';
import { productApi } from '../api/product.api';
import {
  isBridgeUp,
  observeBridge,
  observeSendFailure,
  pollJobOutcome,
  sendToBridge,
} from '../lib/printBridge';
import { printApi } from '../api/print.api';
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

const HSN_GST_RATES_DEBOUNCE_MS = 300;

/**
 * GST rates the rate notifications allow for an HSN, for a stock-in row to offer. Waits for the
 * HSN to settle while it is typed, and asks only once at least a heading (four digits) is there.
 */
export function useHsnGstRatesQuery(hsn: string | undefined) {
  const code = (hsn ?? '').replace(/\D/g, '');
  const [debounced, setDebounced] = useState(code);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(code), HSN_GST_RATES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code]);
  return useQuery<HsnGstRates>({
    queryKey: productKeys.hsnGstRates(debounced),
    queryFn: () => productApi.hsnGstRates(debounced),
    enabled: debounced.length >= 4,
    staleTime: Infinity,
  });
}

/**
 * What a correction would change on an invoice, from the server, while the form is open. Waits
 * for typing to settle; the reason is left out since it does not move any figure.
 */
export function useInvoiceAmendmentPreviewQuery(
  id: string,
  payload: AmendVendorPurchaseInvoicePayload,
  enabled: boolean,
) {
  const [debounced, setDebounced] = useState(payload);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(payload), PURCHASE_TAX_PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [payload]);
  return useQuery({
    queryKey: productKeys.invoiceAmendmentPreview(id, debounced),
    queryFn: () => inventoryApi.previewInvoiceAmendment(id, debounced),
    enabled,
    placeholderData: keepPreviousData,
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

/**
 * The print bridge on this computer, as the backend judges it: not detected, outdated or
 * connected, with the download link. Probing has to happen here - only a page on the shop PC
 * can reach the bridge - but the verdict is the backend's. Re-probed every time `enabled`
 * turns on (the print modal opening) and never retried: `isBridgeUp` already times out.
 */
export function usePrintBridgeStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: productKeys.printBridgeStatus(),
    queryFn: async () => {
      const observation = observeBridge(await isBridgeUp());
      const status = await printApi.bridgeStatus(observation);
      return { observation, status };
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Prints one document on the dot matrix printer. Carries, never decides:
 * 1. ask the backend how (`POST /print-jobs`, with what the bridge probe saw);
 * 2. if it says BRIDGE, send its `bridgeRequest` to the bridge unchanged;
 * 3. watch the bridge's job history for as long as the backend said;
 * 4. report what was seen and return the backend's verdict.
 */
export function usePrintDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      request: CreatePrintJobRequest,
    ): Promise<{ plan: PrintJobPlan; outcome: PrintOutcomeResult | null }> => {
      const plan = await printApi.createJob(request);
      if (plan.action !== 'BRIDGE' || !plan.poll) {
        return { plan, outcome: null };
      }
      let report: ReportPrintOutcomeRequest;
      try {
        const { jobId } = await sendToBridge(plan.bridgeRequest);
        const polled = await pollJobOutcome(jobId, plan.poll);
        report = { observation: polled.observation, bridgeJobId: jobId, error: polled.error };
      } catch (err) {
        const failure = observeSendFailure(err);
        report = { observation: failure.observation, bridgeJobId: null, error: failure.error };
      }
      const outcome = await printApi.reportOutcome(plan.printJobId, report);
      return { plan, outcome };
    },
    onSuccess: ({ outcome }) => {
      if (outcome?.outcome === 'BRIDGE_UNREACHABLE') {
        void queryClient.invalidateQueries({ queryKey: productKeys.printBridgeStatus() });
      }
    },
  });
}
