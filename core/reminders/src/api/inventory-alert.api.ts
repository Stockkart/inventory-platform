import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { InventoryItem, PaginationInventoryResponse } from '@inventory-platform/product/types';
import { INVENTORY_ALERT_ENDPOINTS } from './endpoints';

/** Resolve inventory document id for GET/PUT `/inventory/{id}`. */
export function resolveInventoryDocumentId(
  item: Pick<InventoryItem, 'id' | 'lotId'> | null | undefined,
): string | null {
  if (!item) return null;
  const id = item.id?.trim();
  if (id) return id;
  const lotId = item.lotId?.trim();
  return lotId || null;
}

function normalizeInventoryItem(row: InventoryItem, inventoryDocumentId: string): InventoryItem {
  return {
    ...row,
    id: row.id?.trim() || inventoryDocumentId,
    lotId: row.lotId?.trim() || inventoryDocumentId,
  };
}

export const inventoryAlertApi = {
  getLowStock: async (page = 0, size = 10): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<ApiResponse<PaginationInventoryResponse>>(
      INVENTORY_ALERT_ENDPOINTS.LOW_STOCK,
      { page: String(page), size: String(size) },
    );
    return response.data;
  },

  getById: async (inventoryDocumentId: string): Promise<InventoryItem> => {
    const id = inventoryDocumentId.trim();
    const response = await apiClient.get<ApiResponse<InventoryItem>>(
      INVENTORY_ALERT_ENDPOINTS.BY_ID(id),
    );
    return normalizeInventoryItem(response.data, id);
  },

  updateThreshold: async (inventoryId: string, thresholdCount: number): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(INVENTORY_ALERT_ENDPOINTS.BY_ID(inventoryId), {
      thresholdCount,
    });
  },
};
