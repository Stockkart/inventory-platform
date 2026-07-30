import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { BARCODE_ENDPOINTS } from './endpoints';
import type {
  AttachBarcodeRequest,
  BarcodeLabelDto,
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

  labels: async (data: BarcodeLabelsRequest): Promise<BarcodeLabelDto[]> => {
    const response = await apiClient.post<ApiResponse<{ labels: BarcodeLabelDto[] }>>(
      BARCODE_ENDPOINTS.LABELS,
      data,
    );
    return response.data.labels ?? [];
  },
};
