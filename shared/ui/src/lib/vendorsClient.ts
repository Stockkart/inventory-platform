import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse, VendorResponse } from '@inventory-platform/types';

/** Vendor HTTP helpers for shared UI (avoids core/user ↔ ui cycle). */
export const vendorsClient = {
  getById: async (vendorId: string): Promise<VendorResponse> => {
    const response = await apiClient.get<ApiResponse<VendorResponse>>(
      `/vendors/${vendorId}`
    );
    return response.data;
  },
};
