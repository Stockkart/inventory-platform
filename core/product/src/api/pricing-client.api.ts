import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { PricingResponse } from '@inventory-platform/contracts';
/** Avoid product ↔ pricing module cycle; only methods needed for sell flows. */
export const pricingClient = {
  getById: async (pricingId: string): Promise<PricingResponse> => {
    const response = await apiClient.get<ApiResponse<PricingResponse>>(`/pricing/${pricingId}`);
    return response.data;
  },
};
