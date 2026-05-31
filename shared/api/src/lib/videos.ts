import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, TutorialVideoResponse } from '@inventory-platform/types';

export const videosApi = {
  /** List all active tutorial videos (authenticated). */
  list: async (): Promise<TutorialVideoResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialVideoResponse[]>>(
      API_ENDPOINTS.VIDEOS.BASE
    );
    return response.data;
  },

  /** Resolve by stable key (public keys work without auth, e.g. stockkart-overview). */
  getByKey: async (videoKey: string): Promise<TutorialVideoResponse> => {
    const response = await apiClient.get<ApiResponse<TutorialVideoResponse>>(
      API_ENDPOINTS.VIDEOS.BY_KEY(videoKey)
    );
    return response.data;
  },

  /** Videos mapped to the current dashboard route (authenticated). */
  listForRoute: async (path: string): Promise<TutorialVideoResponse[]> => {
    const response = await apiClient.get<ApiResponse<TutorialVideoResponse[]>>(
      API_ENDPOINTS.VIDEOS.FOR_ROUTE,
      { path }
    );
    return response.data;
  },
};
