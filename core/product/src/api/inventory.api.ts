import { apiClient } from '@inventory-platform/api-client';
import {
  INVENTORY_CORRECTIONS_ENDPOINTS,
  INVENTORY_ENDPOINTS,
  VENDOR_PURCHASE_INVOICES_ENDPOINTS,
  VENDOR_PURCHASE_RETURNS_ENDPOINTS,
} from './endpoints';
import type {
  ApiResponse,
  CreateInventoryDto,
  InventoryResponse,
  InventoryListResponse,
  InventoryExpiryBuckets,
  InventorySearchParams,
  LotsListResponse,
  PaginationInventoryResponse,
  BulkCreateInventoryDto,
  BulkCreateInventoryResponse,
  ParseInvoiceResponse,
  UpdateInventoryRequest,
  InventoryItem,
  VendorPurchaseInvoiceDetail,
  VendorPurchaseInvoiceListResponse,
  VendorPurchaseReturnPayload,
  VendorPurchaseReturnResult,
  VendorPurchaseReturnListDto,
  GetVendorPurchaseReturnsParams,
  CreateInventoryCorrectionRequest,
  InventoryCorrection,
  InventoryCorrectionListResponse,
  PackagingUnit,
} from '@inventory-platform/types';
import axios from 'axios';

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

export const inventoryApi = {
  listPackagingUnits: async (): Promise<PackagingUnit[]> => {
    const response = await apiClient.get<ApiResponse<PackagingUnit[]>>(
      INVENTORY_ENDPOINTS.PACKAGING_UNITS
    );
    return response.data ?? [];
  },

  create: async (data: CreateInventoryDto): Promise<InventoryResponse> => {
    const response = await apiClient.post<ApiResponse<InventoryResponse>>(
      INVENTORY_ENDPOINTS.BASE,
      data
    );
    return response.data;
  },

  createBulk: async (
    data: BulkCreateInventoryDto
  ): Promise<BulkCreateInventoryResponse> => {
    const response = await apiClient.post<
      ApiResponse<BulkCreateInventoryResponse>
    >(INVENTORY_ENDPOINTS.BULK, data);
    // apiClient.post returns ApiResponse<T> directly
    // So response is ApiResponse<BulkCreateInventoryResponse> = { success: true, data: BulkCreateInventoryResponse }
    // We need to return response.data to get the actual BulkCreateInventoryResponse
    return response.data;
  },

  getAll: async (page = 0, size = 10): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<
      ApiResponse<PaginationInventoryResponse>
    >(INVENTORY_ENDPOINTS.BASE, {
      page: String(page),
      size: String(size),
    });
    return response.data;
  },

  getLowStock: async (
    page = 0,
    size = 10
  ): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<
      ApiResponse<PaginationInventoryResponse>
    >(INVENTORY_ENDPOINTS.LOW_STOCK, {
      page: String(page),
      size: String(size),
    });
    return response.data;
  },

  search: async (
    queryOrParams: string | InventorySearchParams,
    page?: number,
    size?: number
  ): Promise<InventoryListResponse> => {
    const params: InventorySearchParams =
      typeof queryOrParams === 'string'
        ? {
            q: queryOrParams,
            limit: size !== undefined ? size : 50,
          }
        : queryOrParams;

    const queryParams: Record<string, string> = {};
    if (params.q?.trim()) queryParams.q = params.q.trim();
    if (params.sort?.trim()) queryParams.sort = params.sort.trim();
    if (params.limit !== undefined && params.limit > 0) {
      queryParams.limit = String(params.limit);
    }
    if (params.filters) {
      for (const [key, val] of Object.entries(params.filters)) {
        if (val?.trim()) {
          queryParams[key] = val.trim();
        }
      }
    }

    const response = await apiClient.get<ApiResponse<InventoryListResponse>>(
      INVENTORY_ENDPOINTS.SEARCH,
      queryParams
    );
    return response.data;
  },

  /** @deprecated Use inventoryApi.search with flat params */
  searchWithFilters: async (
    params: InventorySearchParams
  ): Promise<InventoryListResponse> => {
    return inventoryApi.search(params);
  },

  getExpiryBuckets: async (
    expiringSoonDays?: number
  ): Promise<InventoryExpiryBuckets> => {
    const params: Record<string, string> = {};
    if (expiringSoonDays !== undefined && expiringSoonDays > 0) {
      params.expiringSoonDays = String(expiringSoonDays);
    }
    const response = await apiClient.get<ApiResponse<InventoryExpiryBuckets>>(
      INVENTORY_ENDPOINTS.EXPIRY_BUCKETS,
      params
    );
    return response.data;
  },

  searchLots: async (
    search: string,
    page = 0,
    size = 10
  ): Promise<LotsListResponse> => {
    const response = await apiClient.get<ApiResponse<LotsListResponse>>(
      INVENTORY_ENDPOINTS.LOTS,
      { search, page: String(page), size: String(size) }
    );
    return response.data;
  },

  /** GET /inventory/{inventoryDocumentId} — full detail for edit modals. */
  getById: async (inventoryDocumentId: string): Promise<InventoryItem> => {
    const id = inventoryDocumentId.trim();
    const response = await apiClient.get<ApiResponse<InventoryItem>>(
      INVENTORY_ENDPOINTS.BY_ID(id)
    );
    return normalizeInventoryItem(response.data, id);
  },

  getByIds: async (inventoryIds: string[]): Promise<InventoryItem[]> => {
    const normalizedIds = inventoryIds
      .map((x) => x?.trim())
      .filter((x): x is string => !!x);
    if (normalizedIds.length === 0) return [];

    const response = await apiClient.post<ApiResponse<InventoryItem[]>>(
      INVENTORY_ENDPOINTS.BY_IDS,
      { inventoryIds: normalizedIds }
    );
    const rows = response.data ?? [];
    return normalizedIds
      .map((id, index) => {
        const row = rows[index];
        if (!row) return null;
        return normalizeInventoryItem(row, id);
      })
      .filter((row): row is InventoryItem => row != null);
  },

  updateThreshold: async (
    inventoryId: string,
    thresholdCount: number
  ): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(
      INVENTORY_ENDPOINTS.BY_ID(inventoryId),
      { thresholdCount }
    );
  },

  /** PUT /inventory/{inventoryDocumentId} */
  update: async (
    inventoryDocumentId: string,
    data: UpdateInventoryRequest
  ): Promise<InventoryItem> => {
    const id = inventoryDocumentId.trim();
    const response = await apiClient.put<ApiResponse<InventoryItem>>(
      INVENTORY_ENDPOINTS.BY_ID(id),
      data
    );
    return normalizeInventoryItem(response.data, id);
  },

  parseInvoice: async (imageFile: File): Promise<ParseInvoiceResponse> => {
    return inventoryApi.parseInvoices([imageFile]);
  },

  /** Parse one or more invoice photos (multi-page bills); items are merged in upload order. */
  parseInvoices: async (imageFiles: File[]): Promise<ParseInvoiceResponse> => {
    if (!imageFiles.length) {
      throw new Error('At least one image is required');
    }
    const token = localStorage.getItem('auth_token');
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

    const formData = new FormData();
    if (imageFiles.length === 1) {
      formData.append('image', imageFiles[0]);
    } else {
      for (const file of imageFiles) {
        formData.append('images', file);
      }
    }

    const response = await axios.post<ApiResponse<ParseInvoiceResponse>>(
      `${API_BASE_URL}${INVENTORY_ENDPOINTS.PARSE_INVOICE}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data.data;
  },

  parseStockSheet: async (stockFile: File): Promise<ParseInvoiceResponse> => {
    const token = localStorage.getItem('auth_token');
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

    const formData = new FormData();
    formData.append('file', stockFile);

    const response = await axios.post<ApiResponse<ParseInvoiceResponse>>(
      `${API_BASE_URL}${INVENTORY_ENDPOINTS.PARSE_STOCK_SHEET}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data.data;
  },

  listVendorPurchaseInvoices: async (
    page = 0,
    size = 20,
    query?: string
  ): Promise<VendorPurchaseInvoiceListResponse> => {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
    };
    if (query && query.trim() !== '') params.q = query.trim();
    const response = await apiClient.get<
      ApiResponse<VendorPurchaseInvoiceListResponse>
    >(VENDOR_PURCHASE_INVOICES_ENDPOINTS.BASE, params);
    return response.data;
  },

  getVendorPurchaseInvoice: async (
    id: string
  ): Promise<VendorPurchaseInvoiceDetail> => {
    const response = await apiClient.get<
      ApiResponse<VendorPurchaseInvoiceDetail>
    >(VENDOR_PURCHASE_INVOICES_ENDPOINTS.BY_ID(id));
    return response.data;
  },

  createVendorPurchaseReturn: async (
    payload: VendorPurchaseReturnPayload
  ): Promise<VendorPurchaseReturnResult> => {
    const response = await apiClient.post<
      ApiResponse<VendorPurchaseReturnResult>
    >(VENDOR_PURCHASE_RETURNS_ENDPOINTS.BASE, payload);
    return response.data;
  },

  listVendorPurchaseReturns: async (
    params?: GetVendorPurchaseReturnsParams
  ): Promise<VendorPurchaseReturnListDto> => {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.limit) queryParams.limit = String(params.limit);
    const inv = params?.invoiceNo?.trim();
    if (inv) queryParams.invoiceNo = inv;

    const response = await apiClient.get<
      ApiResponse<VendorPurchaseReturnListDto>
    >(VENDOR_PURCHASE_RETURNS_ENDPOINTS.BASE, queryParams);
    return response.data;
  },

  createInventoryCorrection: async (
    payload: CreateInventoryCorrectionRequest
  ): Promise<InventoryCorrection> => {
    const response = await apiClient.post<ApiResponse<InventoryCorrection>>(
      INVENTORY_CORRECTIONS_ENDPOINTS.BASE,
      payload
    );
    return response.data;
  },

  listInventoryCorrections: async (
    page = 0,
    size = 20,
    status?: string
  ): Promise<InventoryCorrectionListResponse> => {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
    };
    if (status && status.trim() !== '') params.status = status;
    const response = await apiClient.get<ApiResponse<InventoryCorrectionListResponse>>(
      INVENTORY_CORRECTIONS_ENDPOINTS.BASE,
      params
    );
    return response.data;
  },

  approveInventoryCorrectionLine: async (
    correctionId: string,
    lineId: string
  ): Promise<InventoryCorrection> => {
    const response = await apiClient.post<ApiResponse<InventoryCorrection>>(
      INVENTORY_CORRECTIONS_ENDPOINTS.APPROVE_LINE(correctionId, lineId),
      {}
    );
    return response.data;
  },

  rejectInventoryCorrectionLine: async (
    correctionId: string,
    lineId: string,
    reason?: string
  ): Promise<InventoryCorrection> => {
    const response = await apiClient.post<ApiResponse<InventoryCorrection>>(
      INVENTORY_CORRECTIONS_ENDPOINTS.REJECT_LINE(correctionId, lineId),
      { reason: reason ?? null }
    );
    return response.data;
  },
};
