import axios from 'axios';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { CAFE_KOT_ENDPOINTS, CAFE_TAB_ENDPOINTS } from './endpoints';
import type { CafeKot } from '../types/kot';
import type { CafeFlushTarget, CafeTab, CafeTabLineInput } from '../types/tab';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Replicates the Authorization/X-Shop-Id headers apiClient's interceptor would
 * otherwise add (same raw-axios pattern as `flush`/`reprint` below, and
 * core/product/src/api/credit-note.api.ts), with a blob response type for a PDF
 * document.
 */
async function fetchPdfBlob(path: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const shopId = typeof window !== 'undefined' ? localStorage.getItem('x_shop_id') : null;

  const response = await axios.get(`${API_BASE_URL}${path}`, {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(shopId ? { 'X-Shop-Id': shopId } : {}),
    },
  });

  return response.data;
}

/**
 * POSTs with a non-blank `Idempotency-Key` header. `apiClient.post(endpoint, data)` takes
 * no per-call headers argument (see platform/api-client/src/lib/client.ts), so every
 * kitchen-facing write that requires this header (tab `flush`, KOT `reprint`) goes
 * through raw axios instead, replicating the Authorization/X-Shop-Id headers apiClient's
 * interceptor would otherwise add — the same pattern as `fetchPdfBlob` above and
 * core/product/src/api/credit-note.api.ts / inventory.api.ts.
 */
async function postWithIdempotencyKey<T>(
  path: string,
  idempotencyKey: string,
  data?: unknown,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const shopId = typeof window !== 'undefined' ? localStorage.getItem('x_shop_id') : null;

  const response = await axios.post<ApiResponse<T>>(`${API_BASE_URL}${path}`, data, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(shopId ? { 'X-Shop-Id': shopId } : {}),
      'Idempotency-Key': idempotencyKey,
    },
  });

  return response.data.data;
}

/**
 * POSTs with an `Idempotency-Key` and reads the response as a PDF rather than JSON.
 *
 * Reprint returns the rendered slip directly, and it has to: the stamp lives only on that
 * render. `GET .../document` deliberately never stamps REPRINT, so fetching the PDF in a
 * second call after reprinting would hand a cook an unstamped slip — which reads as a
 * fresh order for food already being made.
 */
async function postForPdfBlob(path: string, idempotencyKey: string): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const shopId = typeof window !== 'undefined' ? localStorage.getItem('x_shop_id') : null;

  const response = await axios.post(`${API_BASE_URL}${path}`, undefined, {
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(shopId ? { 'X-Shop-Id': shopId } : {}),
      'Idempotency-Key': idempotencyKey,
    },
  });

  return response.data;
}

export const cafeKotApi = {
  /**
   * Reprints an already-issued ticket: no new ticket, `reprintCount` increments, and the
   * returned PDF is stamped REPRINT so a cook cannot read it as a second order. Requires a
   * non-blank Idempotency-Key like every other kitchen-facing write.
   */
  reprint: (kotId: string, idempotencyKey: string): Promise<Blob> =>
    postForPdfBlob(CAFE_KOT_ENDPOINTS.KOT_REPRINT(kotId), idempotencyKey),

  getKotPdf: async (kotId: string): Promise<Blob> =>
    fetchPdfBlob(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT(kotId)),
};

export const cafeTabApi = {
  /** The cashier's own open tabs — the list endpoint returns only their own. */
  list: async (): Promise<CafeTab[]> => {
    const response = await apiClient.get<ApiResponse<CafeTab[]>>(CAFE_TAB_ENDPOINTS.TABS());
    return response.data;
  },

  open: async (): Promise<CafeTab> => {
    const response = await apiClient.post<ApiResponse<CafeTab>>(CAFE_TAB_ENDPOINTS.TABS());
    return response.data;
  },

  /** Adds a new line, or updates one already on the tab (same `sellableRef`). */
  addLine: async (tabId: string, line: CafeTabLineInput): Promise<CafeTab> => {
    const response = await apiClient.post<ApiResponse<CafeTab>>(
      CAFE_TAB_ENDPOINTS.TAB_LINES(tabId),
      line,
    );
    return response.data;
  },

  removeLine: async (tabId: string, lineRef: string): Promise<CafeTab> => {
    const response = await apiClient.delete<ApiResponse<CafeTab>>(
      CAFE_TAB_ENDPOINTS.TAB_LINE(tabId, lineRef),
    );
    return response.data;
  },

  close: async (tabId: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(CAFE_TAB_ENDPOINTS.TAB(tabId));
  },

  /**
   * Claims the tab's lines, sends one ticket per kitchen station, appends the lines to
   * `target` (or a new bill when `target.purchaseId` is null), and empties the tab —
   * which keeps its token for the next round. Requires a non-blank Idempotency-Key.
   *
   * The caller must park this key outside of a component ref before calling — see
   * lib/punchKeyStore.ts. A key held only in memory dies on remount or reload, and a
   * flush whose response never arrived then leaves the server holding tickets the client
   * can no longer reach.
   */
  flush: (tabId: string, target: CafeFlushTarget, idempotencyKey: string): Promise<CafeKot[]> =>
    postWithIdempotencyKey<CafeKot[]>(CAFE_TAB_ENDPOINTS.TAB_FLUSH(tabId), idempotencyKey, target),
};
