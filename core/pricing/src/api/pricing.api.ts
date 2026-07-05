import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { BulkPricingUpdateDto, PatchPricingDto, PricingResponse } from '@inventory-platform/pricing/types';
import { PRICING_ENDPOINTS } from './endpoints';

export const pricingApi = {
  /** Fetch a single pricing document (required before editing rates). */
  getById: async (pricingId: string): Promise<PricingResponse> => {
    const response = await apiClient.get<ApiResponse<PricingResponse>>(
      PRICING_ENDPOINTS.BY_ID(pricingId)
    );
    return response.data;
  },

  /** Patch a pricing document. When sending rates, always send the full array. */
  update: async (
    pricingId: string,
    data: PatchPricingDto
  ): Promise<PricingResponse> => {
    const response = await apiClient.patch<ApiResponse<PricingResponse>>(
      PRICING_ENDPOINTS.BY_ID(pricingId),
      data
    );
    return response.data;
  },

  bulkUpdate: async (
    updates: BulkPricingUpdateDto['updates']
  ): Promise<PricingResponse[]> => {
    const response = await apiClient.post<ApiResponse<PricingResponse[]>>(
      PRICING_ENDPOINTS.BULK_UPDATE,
      { updates }
    );
    return response.data;
  },
};
