import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { CARD_LAYOUT_ENDPOINTS } from './endpoints';
import type {
  CardFieldCatalogResponse,
  CardLayoutsResponse,
  SaveCardLayoutRequest,
  SurfaceLayoutResponse,
} from '../model/cardLayout.types';

/** Active-shop product card layout API. Every call is shop-scoped by the auth headers. */
export const cardLayoutApi = {
  getAll: async (): Promise<CardLayoutsResponse> => {
    const response = await apiClient.get<ApiResponse<CardLayoutsResponse>>(
      CARD_LAYOUT_ENDPOINTS.BASE,
    );
    return response.data;
  },
  get: async (surfaceId: string): Promise<SurfaceLayoutResponse> => {
    const response = await apiClient.get<ApiResponse<SurfaceLayoutResponse>>(
      CARD_LAYOUT_ENDPOINTS.SURFACE(surfaceId),
    );
    return response.data;
  },
  defaults: async (surfaceId: string): Promise<SurfaceLayoutResponse> => {
    const response = await apiClient.get<ApiResponse<SurfaceLayoutResponse>>(
      CARD_LAYOUT_ENDPOINTS.DEFAULTS(surfaceId),
    );
    return response.data;
  },
  save: async (surfaceId: string, data: SaveCardLayoutRequest): Promise<SurfaceLayoutResponse> => {
    const response = await apiClient.put<ApiResponse<SurfaceLayoutResponse>>(
      CARD_LAYOUT_ENDPOINTS.SURFACE(surfaceId),
      data,
    );
    return response.data;
  },
  fieldCatalog: async (): Promise<CardFieldCatalogResponse> => {
    const response = await apiClient.get<ApiResponse<CardFieldCatalogResponse>>(
      CARD_LAYOUT_ENDPOINTS.FIELD_CATALOG,
    );
    return response.data;
  },
};
