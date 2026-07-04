import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse, PricingResponse } from '@inventory-platform/types';

/** Avoid product ↔ pricing module cycle; only methods needed for sell flows. */
export const pricingClient = {
  getById: async (pricingId: string): Promise<PricingResponse> => {
    const response = await apiClient.get<ApiResponse<PricingResponse>>(
      `/pricing/${pricingId}`
    );
    return response.data;
  },
};
