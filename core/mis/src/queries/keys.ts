import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  MisBankSummaryReportParams,
  MisMoneyReportParams,
  MisSalesReportParams,
  MisStockReportParams,
} from '@inventory-platform/mis/types';

const base = createQueryKeyFactory('mis');

export const misKeys = {
  ...base,
  vendorMoney: (params: MisMoneyReportParams) => [...base.all, 'vendor-money', params] as const,
  customerMoney: (params: MisMoneyReportParams) => [...base.all, 'customer-money', params] as const,
  sales: (params: MisSalesReportParams) => [...base.all, 'sales', params] as const,
  stock: (params: MisStockReportParams) => [...base.all, 'stock', params] as const,
  bankSummary: (params: MisBankSummaryReportParams) =>
    [...base.all, 'bank-summary', params] as const,
};

export const MIS_MODULE_VERSION = '0.1.0';
