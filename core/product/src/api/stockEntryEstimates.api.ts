import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  StockEntryEstimateListResponse,
  StockEntryEstimateResponse,
  StockEntryEstimateState,
  UpsertStockEntryEstimateDto,
} from '@inventory-platform/product/types';
import { STOCK_ENTRY_ESTIMATE_ENDPOINTS } from './endpoints';

export const stockEntryEstimatesApi = {
  list: async (params?: {
    state?: StockEntryEstimateState;
    page?: number;
    size?: number;
  }): Promise<StockEntryEstimateListResponse> => {
    const query: Record<string, string> = {};
    if (params?.state) query.state = params.state;
    if (params?.page != null) query.page = String(params.page);
    if (params?.size != null) query.size = String(params.size);
    const response = await apiClient.get<ApiResponse<StockEntryEstimateListResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.BASE,
      Object.keys(query).length > 0 ? query : undefined,
    );
    return response.data;
  },

  get: async (id: string): Promise<StockEntryEstimateResponse> => {
    const response = await apiClient.get<ApiResponse<StockEntryEstimateResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.BY_ID(id),
    );
    return response.data;
  },

  create: async (data: UpsertStockEntryEstimateDto): Promise<StockEntryEstimateResponse> => {
    const response = await apiClient.post<ApiResponse<StockEntryEstimateResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.BASE,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpsertStockEntryEstimateDto,
  ): Promise<StockEntryEstimateResponse> => {
    const response = await apiClient.put<ApiResponse<StockEntryEstimateResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.BY_ID(id),
      data,
    );
    return response.data;
  },

  discard: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(STOCK_ENTRY_ESTIMATE_ENDPOINTS.BY_ID(id));
  },

  lock: async (id: string): Promise<StockEntryEstimateResponse> => {
    const response = await apiClient.post<ApiResponse<StockEntryEstimateResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.LOCK(id),
      {},
    );
    return response.data;
  },

  markConverted: async (
    id: string,
    vendorPurchaseInvoiceId: string,
  ): Promise<StockEntryEstimateResponse> => {
    const response = await apiClient.post<ApiResponse<StockEntryEstimateResponse>>(
      STOCK_ENTRY_ESTIMATE_ENDPOINTS.MARK_CONVERTED(id),
      { vendorPurchaseInvoiceId },
    );
    return response.data;
  },
};
