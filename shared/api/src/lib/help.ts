import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse, HelpVideoResponse } from '@inventory-platform/types';

export const helpVideosApi = {
  /** List all active help videos (authenticated). */
  list: async (): Promise<HelpVideoResponse[]> => {
    const response = await apiClient.get<ApiResponse<HelpVideoResponse[]>>(
      API_ENDPOINTS.HELP.VIDEOS
    );
    return response.data;
  },

  /** Resolve by stable key (public keys work without auth, e.g. stockkart-overview). */
  getByKey: async (videoKey: string): Promise<HelpVideoResponse> => {
    const response = await apiClient.get<ApiResponse<HelpVideoResponse>>(
      API_ENDPOINTS.HELP.VIDEO_BY_KEY(videoKey)
    );
    return response.data;
  },

  /** Videos mapped to the current dashboard route (authenticated). */
  listForRoute: async (path: string): Promise<HelpVideoResponse[]> => {
    const response = await apiClient.get<ApiResponse<HelpVideoResponse[]>>(
      API_ENDPOINTS.HELP.VIDEOS_FOR_ROUTE,
      { path }
    );
    return response.data;
  },
};
