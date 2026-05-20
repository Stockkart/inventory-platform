import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CreateInventoryDto,
  InventoryResponse,
  InventoryListResponse,
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

export const inventoryApi = {
  listPackagingUnits: async (): Promise<PackagingUnit[]> => {
    const response = await apiClient.get<ApiResponse<PackagingUnit[]>>(
      API_ENDPOINTS.INVENTORY.PACKAGING_UNITS
    );
    return response.data ?? [];
  },

  create: async (data: CreateInventoryDto): Promise<InventoryResponse> => {
    const response = await apiClient.post<ApiResponse<InventoryResponse>>(
      API_ENDPOINTS.INVENTORY.BASE,
      data
    );
    return response.data;
  },

  createBulk: async (
    data: BulkCreateInventoryDto
  ): Promise<BulkCreateInventoryResponse> => {
    const response = await apiClient.post<
      ApiResponse<BulkCreateInventoryResponse>
    >(API_ENDPOINTS.INVENTORY.BULK, data);
    // apiClient.post returns ApiResponse<T> directly
    // So response is ApiResponse<BulkCreateInventoryResponse> = { success: true, data: BulkCreateInventoryResponse }
    // We need to return response.data to get the actual BulkCreateInventoryResponse
    return response.data;
  },

  getAll: async (page = 0, size = 10): Promise<PaginationInventoryResponse> => {
    const response = await apiClient.get<
      ApiResponse<PaginationInventoryResponse>
    >(API_ENDPOINTS.INVENTORY.BASE, {
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
    >(API_ENDPOINTS.INVENTORY.LOW_STOCK, {
      page: String(page),
      size: String(size),
    });
    return response.data;
  },

  search: async (
    query: string,
    page?: number,
    size?: number
  ): Promise<InventoryListResponse> => {
    const params: Record<string, string> = { q: query };
    if (page !== undefined) {
      params.page = String(page);
    }
    if (size !== undefined) {
      params.size = String(size);
    }
    const response = await apiClient.get<ApiResponse<InventoryListResponse>>(
      API_ENDPOINTS.INVENTORY.SEARCH,
      params
    );
    // The API returns { success: true, data: { data: [...], meta: null, page: {...} } }
    // apiClient.get returns r.data which is the full response body: { success: true, data: {...} }
    // So response is ApiResponse<InventoryListResponse> = { success: true, data: InventoryListResponse }
    // response.data is InventoryListResponse = { data: InventoryItem[], meta: unknown | null, page: {...} }
    return response.data;
  },

  searchLots: async (
    search: string,
    page = 0,
    size = 10
  ): Promise<LotsListResponse> => {
    const response = await apiClient.get<ApiResponse<LotsListResponse>>(
      API_ENDPOINTS.INVENTORY.LOTS,
      { search, page: String(page), size: String(size) }
    );
    return response.data;
  },

  getById: async (inventoryId: string): Promise<InventoryItem> => {
    const response = await apiClient.get<ApiResponse<InventoryItem>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId)
    );
    return response.data;
  },

  getByIds: async (inventoryIds: string[]): Promise<InventoryItem[]> => {
    const response = await apiClient.post<ApiResponse<InventoryItem[]>>(
      API_ENDPOINTS.INVENTORY.BY_IDS,
      { inventoryIds }
    );
    return response.data ?? [];
  },

  updateThreshold: async (
    inventoryId: string,
    thresholdCount: number
  ): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId),
      { thresholdCount }
    );
  },

  update: async (
    inventoryId: string,
    data: UpdateInventoryRequest
  ): Promise<InventoryItem> => {
    const response = await apiClient.put<ApiResponse<InventoryItem>>(
      API_ENDPOINTS.INVENTORY.BY_ID(inventoryId),
      data
    );
    return response.data;
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
      `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.PARSE_INVOICE}`,
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
      `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.PARSE_STOCK_SHEET}`,
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
    >(API_ENDPOINTS.VENDOR_PURCHASE_INVOICES.BASE, params);
    return response.data;
  },

  getVendorPurchaseInvoice: async (
    id: string
  ): Promise<VendorPurchaseInvoiceDetail> => {
    const response = await apiClient.get<
      ApiResponse<VendorPurchaseInvoiceDetail>
    >(API_ENDPOINTS.VENDOR_PURCHASE_INVOICES.BY_ID(id));
    return response.data;
  },

  createVendorPurchaseReturn: async (
    payload: VendorPurchaseReturnPayload
  ): Promise<VendorPurchaseReturnResult> => {
    const response = await apiClient.post<
      ApiResponse<VendorPurchaseReturnResult>
    >(API_ENDPOINTS.VENDOR_PURCHASE_RETURNS.BASE, payload);
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
    >(API_ENDPOINTS.VENDOR_PURCHASE_RETURNS.BASE, queryParams);
    return response.data;
  },

  createInventoryCorrection: async (
    payload: CreateInventoryCorrectionRequest
  ): Promise<InventoryCorrection> => {
    const response = await apiClient.post<ApiResponse<InventoryCorrection>>(
      API_ENDPOINTS.INVENTORY_CORRECTIONS.BASE,
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
      API_ENDPOINTS.INVENTORY_CORRECTIONS.BASE,
      params
    );
    return response.data;
  },

  approveInventoryCorrectionLine: async (
    correctionId: string,
    lineId: string
  ): Promise<InventoryCorrection> => {
    const response = await apiClient.post<ApiResponse<InventoryCorrection>>(
      API_ENDPOINTS.INVENTORY_CORRECTIONS.APPROVE_LINE(correctionId, lineId),
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
      API_ENDPOINTS.INVENTORY_CORRECTIONS.REJECT_LINE(correctionId, lineId),
      { reason: reason ?? null }
    );
    return response.data;
  },
};
