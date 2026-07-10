import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  SalesAnalytics,
  ProfitAnalytics,
  VendorAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
} from '@inventory-platform/analytics/types';
import type { InventoryExpiryBuckets } from '@inventory-platform/product/types';
import { ANALYTICS_ENDPOINTS } from './endpoints';

export type SalesAnalyticsParams = {
  startDate?: string;
  endDate?: string;
  groupBy?: 'product' | 'lotId' | 'company' | null;
  timeSeries?: 'hour' | 'day' | 'week' | 'month' | null;
  topN?: number;
  compare?: boolean;
};

export type ProfitAnalyticsParams = {
  startDate?: string;
  endDate?: string;
  groupBy?: 'product' | 'lotId' | 'businessType' | null;
  timeSeries?: 'hour' | 'day' | 'week' | 'month' | null;
  lowMarginThreshold?: number;
};

export type InventoryAnalyticsParams = {
  includeAll?: boolean;
  lowStockThreshold?: number;
  deadStockDays?: number;
  expiringSoonDays?: number;
};

export type VendorAnalyticsParams = {
  startDate?: string;
  endDate?: string;
};

export type CustomerAnalyticsParams = {
  startDate?: string;
  endDate?: string;
  topN?: number;
  includeAll?: boolean;
};

export type ExpiryBucketsParams = {
  expiringSoonDays?: number;
};

function toQuery(params: Record<string, unknown>): Record<string, string> {
  const queryParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    queryParams[key] = String(value);
  });
  return queryParams;
}

export const analyticsApi = {
  getSales: async (params: SalesAnalyticsParams = {}): Promise<SalesAnalytics> => {
    const response = await apiClient.get<ApiResponse<SalesAnalytics>>(
      ANALYTICS_ENDPOINTS.SALES,
      toQuery({
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: params.groupBy ?? undefined,
        timeSeries: params.timeSeries ?? undefined,
        topN: params.topN,
        compare: params.compare,
      }),
    );
    return response.data;
  },

  getProfit: async (params: ProfitAnalyticsParams = {}): Promise<ProfitAnalytics> => {
    const response = await apiClient.get<ApiResponse<ProfitAnalytics>>(
      ANALYTICS_ENDPOINTS.PROFIT,
      toQuery({
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: params.groupBy ?? undefined,
        timeSeriesGranularity: params.timeSeries ?? undefined,
        lowMarginThreshold: params.lowMarginThreshold,
      }),
    );
    return response.data;
  },

  getInventory: async (params: InventoryAnalyticsParams = {}): Promise<InventoryAnalytics> => {
    const response = await apiClient.get<ApiResponse<InventoryAnalytics>>(
      ANALYTICS_ENDPOINTS.INVENTORY,
      toQuery({
        includeAll: params.includeAll,
        lowStockThreshold: params.lowStockThreshold,
        deadStockDays: params.deadStockDays,
        expiringSoonDays: params.expiringSoonDays,
      }),
    );
    return response.data;
  },

  getVendors: async (params: VendorAnalyticsParams = {}): Promise<VendorAnalytics> => {
    const response = await apiClient.get<ApiResponse<VendorAnalytics>>(
      ANALYTICS_ENDPOINTS.VENDORS,
      toQuery({
        startDate: params.startDate,
        endDate: params.endDate,
      }),
    );
    return response.data;
  },

  getCustomers: async (params: CustomerAnalyticsParams = {}): Promise<CustomerAnalytics> => {
    const response = await apiClient.get<ApiResponse<CustomerAnalytics>>(
      ANALYTICS_ENDPOINTS.CUSTOMERS,
      toQuery({
        startDate: params.startDate,
        endDate: params.endDate,
        topN: params.topN,
        includeAll: params.includeAll,
      }),
    );
    return response.data;
  },

  getExpiryBuckets: async (params: ExpiryBucketsParams = {}): Promise<InventoryExpiryBuckets> => {
    const response = await apiClient.get<ApiResponse<InventoryExpiryBuckets>>(
      ANALYTICS_ENDPOINTS.EXPIRY_BUCKETS,
      toQuery({
        expiringSoonDays:
          params.expiringSoonDays !== undefined && params.expiringSoonDays > 0
            ? params.expiringSoonDays
            : undefined,
      }),
    );
    return response.data;
  },
};
