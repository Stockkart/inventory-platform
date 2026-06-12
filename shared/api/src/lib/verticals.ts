import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  SchemaDisplayMode,
  ShopSchemaResponse,
  VerticalSchemaResponse,
  VerticalSummary,
} from '@inventory-platform/types';

export const verticalsApi = {
  listActive: async (): Promise<VerticalSummary[]> => {
    const response = await apiClient.get<ApiResponse<VerticalSummary[]>>(
      API_ENDPOINTS.VERTICALS.BASE
    );
    return response.data;
  },

  getSchema: async (
    verticalId: string,
    mode: SchemaDisplayMode = 'regular',
    version?: string
  ): Promise<VerticalSchemaResponse> => {
    const params: Record<string, string> = { mode };
    if (version) {
      params.version = version;
    }
    const response = await apiClient.get<ApiResponse<VerticalSchemaResponse>>(
      API_ENDPOINTS.VERTICALS.SCHEMA(verticalId),
      params
    );
    return response.data;
  },

  getShopSchema: async (
    mode: SchemaDisplayMode = 'regular'
  ): Promise<ShopSchemaResponse> => {
    const response = await apiClient.get<ApiResponse<ShopSchemaResponse>>(
      API_ENDPOINTS.SHOPS.ME_SCHEMA,
      { mode }
    );
    return response.data;
  },
};
