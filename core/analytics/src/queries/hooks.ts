import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { CustomerAnalytics, InventoryAnalytics, ProfitAnalytics, SalesAnalytics, VendorAnalytics } from '@inventory-platform/analytics/types';
import type { InventoryExpiryBuckets } from '@inventory-platform/product/types';
import {
  analyticsApi,
  type CustomerAnalyticsParams,
  type ExpiryBucketsParams,
  type InventoryAnalyticsParams,
  type ProfitAnalyticsParams,
  type SalesAnalyticsParams,
  type VendorAnalyticsParams,
} from '../api/analytics.api';
import { analyticsKeys } from './keys';

export function useSalesAnalyticsQuery(
  params: SalesAnalyticsParams,
  options?: Omit<UseQueryOptions<SalesAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.sales(params),
    queryFn: () => analyticsApi.getSales(params),
    enabled: Boolean(params.startDate && params.endDate),
    ...options,
  });
}

export function useProfitAnalyticsQuery(
  params: ProfitAnalyticsParams,
  options?: Omit<UseQueryOptions<ProfitAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.profit(params),
    queryFn: () => analyticsApi.getProfit(params),
    enabled: Boolean(params.startDate && params.endDate),
    ...options,
  });
}

export function useInventoryAnalyticsQuery(
  params: InventoryAnalyticsParams,
  options?: Omit<UseQueryOptions<InventoryAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.inventory(params),
    queryFn: () => analyticsApi.getInventory(params),
    ...options,
  });
}

export function useVendorAnalyticsQuery(
  params: VendorAnalyticsParams,
  options?: Omit<UseQueryOptions<VendorAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.vendors(params),
    queryFn: () => analyticsApi.getVendors(params),
    enabled: Boolean(params.startDate && params.endDate),
    ...options,
  });
}

export function useCustomerAnalyticsQuery(
  params: CustomerAnalyticsParams,
  options?: Omit<UseQueryOptions<CustomerAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.customers(params),
    queryFn: () => analyticsApi.getCustomers(params),
    enabled: Boolean(params.startDate && params.endDate),
    ...options,
  });
}

export function useExpiryBucketsQuery(
  params: ExpiryBucketsParams,
  options?: Omit<UseQueryOptions<InventoryExpiryBuckets>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.expiryBuckets(params),
    queryFn: () => analyticsApi.getExpiryBuckets(params),
    ...options,
  });
}
