import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  CartResponse,
  ConvertEstimateResponse,
  CreateEstimateDto,
  EstimateListResponse,
  EstimateState,
} from '@inventory-platform/product/types';
import { ESTIMATE_ENDPOINTS } from './endpoints';

export const estimatesApi = {
  list: async (state?: EstimateState): Promise<EstimateListResponse> => {
    const response = await apiClient.get<ApiResponse<EstimateListResponse>>(
      ESTIMATE_ENDPOINTS.BASE,
      state ? { state } : undefined,
    );
    return response.data;
  },

  create: async (data: CreateEstimateDto): Promise<CartResponse> => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(ESTIMATE_ENDPOINTS.BASE, data);
    return response.data;
  },

  get: async (purchaseId: string): Promise<CartResponse> => {
    const response = await apiClient.get<ApiResponse<CartResponse>>(
      ESTIMATE_ENDPOINTS.BY_ID(purchaseId),
    );
    return response.data;
  },

  convert: async (purchaseId: string): Promise<ConvertEstimateResponse> => {
    const response = await apiClient.post<ApiResponse<ConvertEstimateResponse>>(
      ESTIMATE_ENDPOINTS.CONVERT(purchaseId),
      {},
    );
    return response.data;
  },

  discard: async (purchaseId: string): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>(ESTIMATE_ENDPOINTS.BY_ID(purchaseId));
  },
};
