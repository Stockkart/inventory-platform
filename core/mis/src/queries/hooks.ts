import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type {
  MisMoneyReportParams,
  MisMoneyReportResponse,
  MisSalesReportParams,
  MisSalesReportResponse,
  MisStockReportParams,
  MisStockReportResponse,
} from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { misKeys } from './keys';

export function useVendorMoneyMisQuery(
  params: MisMoneyReportParams,
  options?: Omit<UseQueryOptions<MisMoneyReportResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: misKeys.vendorMoney(params),
    queryFn: () => misApi.vendorMoney(params),
    ...options,
  });
}

export function useCustomerMoneyMisQuery(
  params: MisMoneyReportParams,
  options?: Omit<UseQueryOptions<MisMoneyReportResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: misKeys.customerMoney(params),
    queryFn: () => misApi.customerMoney(params),
    ...options,
  });
}

export function useSalesMisQuery(
  params: MisSalesReportParams,
  options?: Omit<UseQueryOptions<MisSalesReportResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: misKeys.sales(params),
    queryFn: () => misApi.sales(params),
    ...options,
  });
}

export function useStockMisQuery(
  params: MisStockReportParams,
  options?: Omit<UseQueryOptions<MisStockReportResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: misKeys.stock(params),
    queryFn: () => misApi.stock(params),
    ...options,
  });
}
