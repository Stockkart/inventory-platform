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
  InventoryItem,
  PrintBridgeConnection,
  PrintJobPlan,
  PrintOutcomeResult,
  PurchaseTaxPreviewRequest,
  ReportPrintOutcomeRequest,
  StockEntryEstimateResponse,
  UpdateInventoryRequest,
} from '@inventory-platform/product/types';
import { inventoryApi } from '../api/inventory.api';
import { estimatesApi } from '../api/estimates.api';
import { productApi } from '../api/product.api';
import {
  getJobs,
  isBridgeUp,
  observeBridge,
  observeSendFailure,
  pollJobOutcome,
  PrintBridgeError,
  sendToBridge,
  type BridgeJob,
} from '../lib/printBridge';
import {
  findPendingPrintJob,
  listCachedPrintJobs,
  putCachedPrintJob,
  removeCachedPrintJob,
  type CachedPrintJob,
} from '../lib/printJobCache';
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
/** One lot by its inventory document id (GET /inventory/{id}), with its prices. */
export function useInventoryLotQuery(inventoryId: string | null | undefined) {
  return useQuery({
    queryKey: productKeys.inventoryDetail(inventoryId ?? ''),
    queryFn: () => inventoryApi.getById(inventoryId as string),
    enabled: !!inventoryId,
  });
}

/**
 * Updates one lot (PUT /inventory/{id}). The answer replaces the cached lot, and every product
 * read is marked stale so product search and scan-sell show the new values.
 */
export function useUpdateInventoryLotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      payload,
    }: {
      inventoryId: string;
      payload: UpdateInventoryRequest;
    }) => inventoryApi.update(inventoryId, payload),
    onSuccess: (updated: InventoryItem, { inventoryId }) => {
      queryClient.setQueryData(productKeys.inventoryDetail(inventoryId), updated);
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

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
 * can reach the bridge - but the verdict is the backend's, and so is where the bridge listens
 * and how long to wait on it (`connection`). Re-probed every time `enabled` turns on (the print
 * modal opening) and never retried: `isBridgeUp` already times out.
 */
export function usePrintBridgeStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: productKeys.printBridgeStatus(),
    queryFn: async () => {
      const connection = await printApi.bridgeConnection();
      const observation = observeBridge(await isBridgeUp(connection));
      const status = await printApi.bridgeStatus(observation);
      return { connection, observation, status };
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
 * 1. if this browser already sent the document, look once more at the bridge: a job that has
 *    since finished is reported and forgotten, so it no longer counts as on its way;
 * 2. ask the backend how (`POST /print-jobs`, with what the probe saw and how long ago the
 *    document was sent, if it still is);
 * 3. if it says BRIDGE, note the job in `lib/printJobCache.ts`, send its `bridgeRequest` to the
 *    bridge unchanged, and watch the bridge's job history for as long as the backend said;
 * 4. forget the job once it has finished, or keep it while it is still queued, so a later
 *    check can report how it ended; report what was seen and return the backend's verdict.
 */
export function usePrintDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      connection,
    }: {
      request: Omit<CreatePrintJobRequest, 'pendingAgeMs'>;
      /** From the bridge status query; null when it has not loaded, which reads as unreachable. */
      connection: PrintBridgeConnection | null;
    }): Promise<{ plan: PrintJobPlan; outcome: PrintOutcomeResult | null }> => {
      const { source, documentId } = request;
      let pending = findPendingPrintJob(source, documentId, Date.now());
      if (pending?.bridgeJobId && connection) {
        const seen = finishedJob(await getJobs(connection), pending.bridgeJobId);
        if (seen) {
          removeCachedPrintJob(source, documentId);
          // Only counts it; the operator is printing again either way.
          void printApi
            .reportOutcome({ source, bridgeJobId: pending.bridgeJobId, ...seen })
            .catch(() => undefined);
          pending = null;
        }
      }

      const sentAt = Date.now();
      const plan = await printApi.createJob({
        ...request,
        pendingAgeMs: pending ? sentAt - pending.sentAt : null,
      });
      if (plan.action !== 'BRIDGE' || !plan.poll) {
        return { plan, outcome: null };
      }

      const entry: CachedPrintJob = {
        source,
        documentId,
        documentKind: plan.documentKind,
        documentNumber: plan.documentNumber,
        bridgeJobId: null,
        sentAt,
        watchUntil: sentAt + (connection?.printTimeoutMs ?? 0) + plan.poll.budgetMs,
        expiresAt: sentAt + plan.inFlightTtlMs,
      };
      // Noted before sending, so another tab clicking meanwhile already sees it on its way.
      putCachedPrintJob(entry);

      let report: ReportPrintOutcomeRequest;
      try {
        if (!connection) {
          throw new PrintBridgeError('Print bridge connection is not known yet', 'UNREACHABLE');
        }
        const { jobId } = await sendToBridge(connection, plan.bridgeRequest);
        putCachedPrintJob({ ...entry, bridgeJobId: jobId });
        const polled = await pollJobOutcome(connection, jobId, plan.poll);
        report = {
          source,
          observation: polled.observation,
          bridgeJobId: jobId,
          error: polled.error,
        };
      } catch (err) {
        const failure = observeSendFailure(err);
        report = {
          source,
          observation: failure.observation,
          bridgeJobId: null,
          error: failure.error,
        };
      }
      if (report.observation !== 'STILL_QUEUED') {
        removeCachedPrintJob(source, documentId);
      }
      const outcome = await printApi.reportOutcome(report);
      return { plan, outcome };
    },
    onSuccess: ({ outcome }) => {
      if (outcome?.outcome === 'BRIDGE_UNREACHABLE') {
        void queryClient.invalidateQueries({ queryKey: productKeys.printBridgeStatus() });
      }
    },
  });
}

/** A late result for a job this browser sent earlier: what it was and what it came to. */
export interface SettledPrintJob {
  job: CachedPrintJob;
  outcome: PrintOutcomeResult;
}

/**
 * Settles the jobs `lib/printJobCache.ts` still holds from earlier prints, so a job that was
 * still queued when its modal closed is not left unknown. One look at the bridge's job history:
 * a job it shows PRINTED or FAILED is reported with that; one past its in-flight time without
 * either is reported EXPIRED. Jobs a tab is still watching, or still within their time, are left
 * alone. Returns what was settled, for the print modal to tell the operator.
 */
export function useSettleCachedPrintJobsMutation() {
  return useMutation({
    mutationFn: async (connection: PrintBridgeConnection): Promise<SettledPrintJob[]> => {
      const now = Date.now();
      const due = listCachedPrintJobs().filter((job) => job.watchUntil <= now);
      if (due.length === 0) {
        return [];
      }
      const bridgeJobs = due.some((job) => job.bridgeJobId) ? await getJobs(connection) : [];
      const settled: SettledPrintJob[] = [];
      for (const job of due) {
        const seen = job.bridgeJobId ? finishedJob(bridgeJobs, job.bridgeJobId) : null;
        const observation = seen ?? (job.expiresAt <= now ? EXPIRED : null);
        if (!observation) {
          continue;
        }
        removeCachedPrintJob(job.source, job.documentId);
        const outcome = await printApi.reportOutcome({
          source: job.source,
          bridgeJobId: job.bridgeJobId,
          ...observation,
        });
        settled.push({ job, outcome });
      }
      return settled;
    },
  });
}

const EXPIRED = { observation: 'EXPIRED', error: null } as const;

/** The bridge's terminal state for one job, or null while it is queued or not listed. */
function finishedJob(
  jobs: BridgeJob[],
  bridgeJobId: string,
): Pick<ReportPrintOutcomeRequest, 'observation' | 'error'> | null {
  const job = jobs.find((candidate) => candidate.id === bridgeJobId);
  if (job?.status === 'PRINTED') {
    return { observation: 'PRINTED', error: null };
  }
  if (job?.status === 'FAILED') {
    return { observation: 'FAILED', error: job.error && job.error.length > 0 ? job.error : null };
  }
  return null;
}
