import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import { GSTIN_ENDPOINTS } from './endpoints';

/**
 * GSTIN checks. The server validates offline first, then answers from its registry, and asks the
 * GST network only for a GSTIN it has never seen — so repeat lookups cost nothing.
 */
export const gstinApi = {
  lookup: async (gstin: string, signal?: AbortSignal): Promise<GstinLookupResult> => {
    const response = await apiClient.get<ApiResponse<GstinLookupResult>>(
      GSTIN_ENDPOINTS.LOOKUP(gstin),
      undefined,
      { signal },
    );
    return response.data;
  },

  reverify: async (gstin: string): Promise<GstinLookupResult> => {
    const response = await apiClient.post<ApiResponse<GstinLookupResult>>(
      GSTIN_ENDPOINTS.REVERIFY(gstin),
    );
    return response.data;
  },
};
