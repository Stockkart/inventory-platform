import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { TutorialResourceResponse } from '@inventory-platform/shell/types';
import { RESOURCE_ENDPOINTS } from './endpoints';

export const resourcesApi = {
  list: async (): Promise<TutorialResourceResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse[]>>(
      RESOURCE_ENDPOINTS.BASE,
    );
    return response.data;
  },

  getByKey: async (videoKey: string): Promise<TutorialResourceResponse> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse>>(
      RESOURCE_ENDPOINTS.BY_KEY(videoKey),
    );
    return response.data;
  },

  listForRoute: async (path: string): Promise<TutorialResourceResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialResourceResponse[]>>(
      RESOURCE_ENDPOINTS.FOR_ROUTE,
      { path },
    );
    return response.data;
  },
};
