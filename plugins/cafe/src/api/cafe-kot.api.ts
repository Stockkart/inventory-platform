import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { CAFE_KOT_ENDPOINTS, CAFE_TAB_ENDPOINTS } from './endpoints';
import type { CafeKot } from '../types/kot';
import type { CafeFlushTarget, CafeTab, CafeTabLineInput } from '../types/tab';

/**
 * Every call here goes through `apiClient`, including the kitchen-facing writes.
 *
 * They used to be issued through raw `axios`, hand-copying the Authorization/X-Shop-Id
 * headers, because `apiClient.post` took no per-call headers and this module needs to send a
 * non-blank `Idempotency-Key`. The cost was the whole response interceptor: a token that
 * expires mid-shift returned a bare `AxiosError`, so the 401 handler never bounced the
 * cashier to login and the dialog showed "Request failed with status code 401" next to a
 * button they could press forever. 402 plan-expired never fired either, and nothing became
 * an `ApiError`. `apiClient` now carries `ApiRequestOptions.headers` and blob-bodied
 * `getBlob`/`postBlob`, so there is no longer a reason to leave this layer.
 */
function idempotent(idempotencyKey: string) {
  return { headers: { 'Idempotency-Key': idempotencyKey } };
}

export const cafeKotApi = {
  /**
   * Reprints an already-issued ticket: no new ticket, `reprintCount` increments, and the
   * returned PDF is stamped REPRINT so a cook cannot read it as a second order. Requires a
   * non-blank Idempotency-Key like every other kitchen-facing write.
   *
   * Reads the response as the slip itself rather than as JSON, and it has to: the stamp lives
   * only on that render. `GET .../document` deliberately never stamps REPRINT, so fetching
   * the PDF in a second call after reprinting would hand a cook an unstamped slip — which
   * reads as a fresh order for food already being made.
   */
  reprint: (kotId: string, idempotencyKey: string): Promise<Blob> =>
    apiClient.postBlob(
      CAFE_KOT_ENDPOINTS.KOT_REPRINT(kotId),
      undefined,
      idempotent(idempotencyKey),
    ),

  getKotPdf: (kotId: string): Promise<Blob> =>
    apiClient.getBlob(CAFE_KOT_ENDPOINTS.KOT_DOCUMENT(kotId)),
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
  flush: async (
    tabId: string,
    target: CafeFlushTarget,
    idempotencyKey: string,
  ): Promise<CafeKot[]> => {
    const response = await apiClient.post<ApiResponse<CafeKot[]>>(
      CAFE_TAB_ENDPOINTS.TAB_FLUSH(tabId),
      target,
      idempotent(idempotencyKey),
    );
    return response.data;
  },
};
