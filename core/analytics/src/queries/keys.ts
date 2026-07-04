import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  CustomerAnalyticsParams,
  ExpiryBucketsParams,
  InventoryAnalyticsParams,
  ProfitAnalyticsParams,
  SalesAnalyticsParams,
  VendorAnalyticsParams,
} from '../api/analytics.api';

const base = createQueryKeyFactory('analytics');

export const analyticsKeys = {
  ...base,
  sales: (params: SalesAnalyticsParams) => [...base.all, 'sales', params] as const,
  profit: (params: ProfitAnalyticsParams) => [...base.all, 'profit', params] as const,
  inventory: (params: InventoryAnalyticsParams) =>
    [...base.all, 'inventory', params] as const,
  vendors: (params: VendorAnalyticsParams) => [...base.all, 'vendors', params] as const,
  customers: (params: CustomerAnalyticsParams) =>
    [...base.all, 'customers', params] as const,
  expiryBuckets: (params: ExpiryBucketsParams) =>
    [...base.all, 'expiry-buckets', params] as const,
};

export const ANALYTICS_MODULE_VERSION = '0.1.0';
