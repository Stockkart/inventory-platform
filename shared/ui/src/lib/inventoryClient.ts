import { apiClient } from '@inventory-platform/api-client';
import type {
  ApiResponse,
  GetVendorPurchaseReturnsParams,
  InventoryItem,
  UpdateInventoryRequest,
  VendorPurchaseReturnListDto,
} from '@inventory-platform/types';

/** Resolve inventory document id for GET/PUT `/inventory/{id}`. */
export function resolveInventoryDocumentId(
  item: Pick<InventoryItem, 'id' | 'lotId'> | null | undefined
): string | null {
  if (!item) return null;
  const id = item.id?.trim();
  if (id) return id;
  const lotId = item.lotId?.trim();
  return lotId || null;
}

function normalizeInventoryItem(
  row: InventoryItem,
  inventoryDocumentId: string
): InventoryItem {
  return {
    ...row,
    id: row.id?.trim() || inventoryDocumentId,
    lotId: row.lotId?.trim() || inventoryDocumentId,
  };
}

/** Inventory HTTP helpers for shared UI (avoids core/product ↔ ui cycle). */
export const inventoryClient = {
  update: async (
    inventoryDocumentId: string,
    data: UpdateInventoryRequest
  ): Promise<InventoryItem> => {
    const id = inventoryDocumentId.trim();
    const response = await apiClient.put<ApiResponse<InventoryItem>>(
      `/inventory/${id}`,
      data
    );
    return normalizeInventoryItem(response.data, id);
  },

  listVendorPurchaseReturns: async (
    params?: GetVendorPurchaseReturnsParams
  ): Promise<VendorPurchaseReturnListDto> => {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.limit) queryParams.limit = String(params.limit);
    const inv = params?.invoiceNo?.trim();
    if (inv) queryParams.invoiceNo = inv;

    const response = await apiClient.get<ApiResponse<VendorPurchaseReturnListDto>>(
      '/vendor-purchase-returns',
      queryParams
    );
    return response.data;
  },
};
