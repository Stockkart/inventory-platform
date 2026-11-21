import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { GRID_LAYOUT_ENDPOINTS } from './endpoints';
import type { GridLayoutChange, GridLayoutResponse } from '../model/gridLayout.types';

/** Active-shop grid column layout API. A layout is shared by every member of the shop. */
export const gridLayoutApi = {
  get: async (gridId: string): Promise<GridLayoutResponse> => {
    const response = await apiClient.get<ApiResponse<GridLayoutResponse>>(
      GRID_LAYOUT_ENDPOINTS.GRID(gridId),
    );
    return response.data;
  },
  /** One change; owner or admin only. */
  change: async (gridId: string, change: GridLayoutChange): Promise<GridLayoutResponse> => {
    const response = await apiClient.patch<ApiResponse<GridLayoutResponse>>(
      GRID_LAYOUT_ENDPOINTS.GRID(gridId),
      change,
    );
    return response.data;
  },
  /** Back to the default; owner or admin only. */
  reset: async (gridId: string): Promise<GridLayoutResponse> => {
    const response = await apiClient.delete<ApiResponse<GridLayoutResponse>>(
      GRID_LAYOUT_ENDPOINTS.GRID(gridId),
    );
    return response.data;
  },
};
