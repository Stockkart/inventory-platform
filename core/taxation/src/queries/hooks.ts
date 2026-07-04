import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  Gstr1ReportResponse,
  Gstr2ReportResponse,
  Gstr3bReportResponse,
} from '@inventory-platform/types';
import { gstr1Api } from '../api/gstr1.api';
import { gstr2Api } from '../api/gstr2.api';
import { gstr3bApi } from '../api/gstr3b.api';
import { taxationKeys } from './keys';

export function useGstr1ReportQuery(
  period: string,
  options?: Omit<UseQueryOptions<Gstr1ReportResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taxationKeys.gstr1Report(period),
    queryFn: () => gstr1Api.getReport(period),
    enabled: Boolean(period),
    ...options,
  });
}

export function useGstr2ReportQuery(
  period: string,
  options?: Omit<UseQueryOptions<Gstr2ReportResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taxationKeys.gstr2Report(period),
    queryFn: () => gstr2Api.getReport(period),
    enabled: Boolean(period),
    ...options,
  });
}

export function useGstr3bReportQuery(
  period: string,
  options?: Omit<UseQueryOptions<Gstr3bReportResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: taxationKeys.gstr3bReport(period),
    queryFn: () => gstr3bApi.getReport(period),
    enabled: Boolean(period),
    ...options,
  });
}

export function useGstr1ExcelDownloadMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof gstr1Api.downloadExcel>>,
    Error,
    string
  >
) {
  return useMutation({
    mutationFn: (period) => gstr1Api.downloadExcel(period),
    ...options,
  });
}

export function useGstr1OfflineJsonDownloadMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof gstr1Api.downloadOfflineReturnJson>>,
    Error,
    string
  >
) {
  return useMutation({
    mutationFn: (period) => gstr1Api.downloadOfflineReturnJson(period),
    ...options,
  });
}

export function useGstr2ExcelDownloadMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof gstr2Api.downloadExcel>>,
    Error,
    string
  >
) {
  return useMutation({
    mutationFn: (period) => gstr2Api.downloadExcel(period),
    ...options,
  });
}

export function useGstr3bExcelDownloadMutation(
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof gstr3bApi.downloadExcel>>,
    Error,
    string
  >
) {
  return useMutation({
    mutationFn: (period) => gstr3bApi.downloadExcel(period),
    ...options,
  });
}
