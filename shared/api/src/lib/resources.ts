import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, TutorialResourceResponse } from '@inventory-platform/types';

export const resourcesApi = {
  /** List all active tutorial resources (authenticated). */
  list: async (): Promise<TutorialResourceResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse[]>>(
      API_ENDPOINTS.RESOURCES.BASE
    );
    return response.data;
  },

  /** Resolve by stable key (public keys work without auth, e.g. stockkart-overview). */
  getByKey: async (videoKey: string): Promise<TutorialResourceResponse> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse>>(
      API_ENDPOINTS.RESOURCES.BY_KEY(videoKey)
    );
    return response.data;
  },

  /** Resources mapped to the current dashboard route (authenticated). */
  listForRoute: async (path: string): Promise<TutorialResourceResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse[]>>(
      API_ENDPOINTS.RESOURCES.FOR_ROUTE,
      { path }
    );
    return response.data;
  },
};
