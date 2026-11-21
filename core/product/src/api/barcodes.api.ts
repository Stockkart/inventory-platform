import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { BARCODE_ENDPOINTS } from './endpoints';
import { labelLayoutSession } from '../lib/labelLayoutSession';
import type {
  BarcodeLabelsResponse,
  LabelData,
  LabelLayoutResponse,
} from '../model/labelLayout.types';
import type {
  AttachBarcodeRequest,
  BarcodeLabelsRequest,
  BarcodePoolItem,
  BarcodePoolListResponse,
  GenerateBarcodesRequest,
  GenerateBarcodesResponse,
} from '../model/types';

export const barcodesApi = {
  generate: async (data?: GenerateBarcodesRequest): Promise<GenerateBarcodesResponse> => {
    const response = await apiClient.post<ApiResponse<GenerateBarcodesResponse>>(
      BARCODE_ENDPOINTS.GENERATE,
      data ?? { count: 1 },
    );
    return response.data;
  },

  generateOne: async (): Promise<string> => {
    const result = await barcodesApi.generate({ count: 1 });
    const code = result.items?.[0]?.code;
    if (!code) {
      throw new Error('No barcode returned');
    }
    return code;
  },

  list: async (params?: {
    status?: 'UNUSED' | 'ATTACHED';
    q?: string;
    limit?: number;
  }): Promise<BarcodePoolItem[]> => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.q?.trim()) search.set('q', params.q.trim());
    if (params?.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    const response = await apiClient.get<ApiResponse<BarcodePoolListResponse>>(
      qs ? `${BARCODE_ENDPOINTS.BASE}?${qs}` : BARCODE_ENDPOINTS.BASE,
    );
    return response.data.items ?? [];
  },

  attach: async (code: string, data: AttachBarcodeRequest): Promise<BarcodePoolItem> => {
    const response = await apiClient.post<ApiResponse<BarcodePoolItem>>(
      BARCODE_ENDPOINTS.ATTACH(code),
      data,
    );
    return response.data;
  },

  /**
   * Resolve printable labels plus the shop's effective layout in one call (Req 6.11).
   * Forwards `inventoryIds` so the server can resolve lot values from the scanned row.
   * When the server returns a `layout`, it is cached in `labelLayoutSession` for
   * later offline prints (Req 7.8, 7.9). Older servers that return only `{ labels }`
   * yield `layout: null`.
   */
  labels: async (data: BarcodeLabelsRequest): Promise<BarcodeLabelsResponse> => {
    const response = await apiClient.post<
      ApiResponse<{ labels?: LabelData[] | null; layout?: LabelLayoutResponse | null }>
    >(BARCODE_ENDPOINTS.LABELS, {
      ...(data.productIds?.length ? { productIds: data.productIds } : {}),
      ...(data.codes?.length ? { codes: data.codes } : {}),
      ...(data.inventoryIds ? { inventoryIds: data.inventoryIds } : {}),
    });
    const layout = response.data.layout ?? null;
    if (layout) {
      labelLayoutSession.set(layout);
    }
    return { labels: response.data.labels ?? [], layout };
  },
};
