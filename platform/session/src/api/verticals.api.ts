import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  SchemaDisplayMode,
  ShopSchemaResponse,
  VerticalSchemaResponse,
  VerticalSummary,
} from '@inventory-platform/schema/types';
import { SESSION_SHOP_ENDPOINTS, VERTICAL_ENDPOINTS } from './endpoints';

export const verticalsApi = {
  listActive: async (): Promise<VerticalSummary[]> => {
    const response = await apiClient.get<ApiResponse<VerticalSummary[]>>(VERTICAL_ENDPOINTS.BASE);
    return response.data;
  },

  getSchema: async (
    verticalId: string,
    mode: SchemaDisplayMode = 'regular',
    version?: string,
  ): Promise<VerticalSchemaResponse> => {
    const params: Record<string, string> = { mode };
    if (version) {
      params.version = version;
    }
    const response = await apiClient.get<ApiResponse<VerticalSchemaResponse>>(
      VERTICAL_ENDPOINTS.SCHEMA(verticalId),
      params,
    );
    return response.data;
  },

  getShopSchema: async (mode: SchemaDisplayMode = 'regular'): Promise<ShopSchemaResponse> => {
    const response = await apiClient.get<ApiResponse<ShopSchemaResponse>>(
      SESSION_SHOP_ENDPOINTS.ME_SCHEMA,
      { mode },
    );
    return response.data;
  },
};
