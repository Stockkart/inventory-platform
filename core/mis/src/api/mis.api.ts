import { apiClient } from '@inventory-platform/api-client';
import type {
  MisBankSummaryReportParams,
  MisBankSummaryReportResponse,
  MisMoneyReportParams,
  MisMoneyReportResponse,
  MisSalesReportParams,
  MisSalesReportResponse,
  MisStockPeriodSnapshot,
  MisStockReportParams,
  MisStockReportResponse,
} from '@inventory-platform/mis/types';
import { downloadMisBlob } from './download';
import { MIS_ENDPOINTS } from './endpoints';

function unwrap<T>(raw: unknown): T | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return raw as T;
  const o = raw as Record<string, unknown>;
  if ('success' in o) {
    if ('data' in o) return o.data as T;
    return undefined;
  }
  return raw as T;
}

function asNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return 0;
}

function asLong(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Math.trunc(Number(v));
  }
  return 0;
}

function toQuery(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === 'boolean') {
      out[k] = v ? 'true' : 'false';
      return;
    }
    if (typeof v === 'string' && v.trim() === '') return;
    out[k] = String(v);
  });
  return out;
}

function moneyQuery(
  params: MisMoneyReportParams,
  opts?: { paging?: boolean },
): Record<string, string> {
  const txnTypes = Array.isArray(params.txnTypes) ? params.txnTypes.join(',') : params.txnTypes;
  const includePaging = opts?.paging !== false;
  return toQuery({
    from: params.from,
    to: params.to,
    ...(includePaging
      ? {
          page: params.page,
          size: params.size,
        }
      : {}),
    q: params.q,
    vendorId: params.vendorId,
    customerId: params.customerId,
    txnTypes,
    moneyFilter: params.moneyFilter,
  });
}

function salesQuery(
  params: MisSalesReportParams,
  opts?: { paging?: boolean },
): Record<string, string> {
  const includePaging = opts?.paging !== false;
  return toQuery({
    from: params.from,
    to: params.to,
    ...(includePaging
      ? {
          page: params.page,
          size: params.size,
        }
      : {}),
    q: params.q,
    customerId: params.customerId,
    paymentMethod: params.paymentMethod,
  });
}

function stockQuery(
  params: MisStockReportParams,
  opts?: { paging?: boolean },
): Record<string, string> {
  const includePaging = opts?.paging !== false;
  return toQuery({
    ...(includePaging
      ? {
          page: params.page,
          size: params.size,
        }
      : {}),
    q: params.q,
    lowStockOnly: params.lowStockOnly === true ? true : undefined,
    deadStockOnly: params.deadStockOnly === true ? true : undefined,
  });
}

function bankSummaryQuery(
  params: MisBankSummaryReportParams,
  opts?: { paging?: boolean },
): Record<string, string> {
  const includePaging = opts?.paging !== false;
  return toQuery({
    from: params.from,
    to: params.to,
    ...(includePaging
      ? {
          page: params.page,
          size: params.size,
        }
      : {}),
    q: params.q,
  });
}

function emptyBankSummaryTotals(): MisBankSummaryReportResponse['totals'] {
  return {
    companyCount: 0,
    opening: 0,
    purchase: 0,
    sale: 0,
    adjustment: 0,
    closing: 0,
  };
}

function normalizeBankSummary(res: MisBankSummaryReportResponse): MisBankSummaryReportResponse {
  const totals = res.totals;
  return {
    ...res,
    openingSource: res.openingSource === 'SNAPSHOT' ? 'SNAPSHOT' : 'DERIVED',
    hasAdjustments: Boolean(res.hasAdjustments),
    periodClosed: Boolean(res.periodClosed),
    page: asLong(res.page),
    size: asLong(res.size),
    totalItems: asLong(res.totalItems),
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      opening: asNum(r.opening),
      purchase: asNum(r.purchase),
      sale: asNum(r.sale),
      adjustment: asNum(r.adjustment),
      closing: asNum(r.closing),
    })),
    totals: {
      companyCount: asLong(totals?.companyCount),
      opening: asNum(totals?.opening),
      purchase: asNum(totals?.purchase),
      sale: asNum(totals?.sale),
      adjustment: asNum(totals?.adjustment),
      closing: asNum(totals?.closing),
    },
  };
}

function emptyMoneySummary(): MisMoneyReportResponse['summary'] {
  return {
    openingBalanceTotal: 0,
    periodCashTotal: 0,
    periodOnlineTotal: 0,
    periodCreditTotal: 0,
    periodPurchaseOrSaleTotal: 0,
    currentBalanceTotal: 0,
    partySummaries: [],
  };
}

function normalizeMoneyReport(res: MisMoneyReportResponse): MisMoneyReportResponse {
  const summary = res.summary;
  return {
    ...res,
    page: asLong(res.page),
    size: asLong(res.size),
    totalItems: asLong(res.totalItems),
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      totalAmount: asNum(r.totalAmount),
      cashAmount: asNum(r.cashAmount),
      onlineAmount: asNum(r.onlineAmount),
      creditAmount: asNum(r.creditAmount),
      balanceAfter: asNum(r.balanceAfter),
      opening: Boolean(r.opening),
    })),
    summary: {
      openingBalanceTotal: asNum(summary?.openingBalanceTotal),
      periodCashTotal: asNum(summary?.periodCashTotal),
      periodOnlineTotal: asNum(summary?.periodOnlineTotal),
      periodCreditTotal: asNum(summary?.periodCreditTotal),
      periodPurchaseOrSaleTotal: asNum(summary?.periodPurchaseOrSaleTotal),
      currentBalanceTotal: asNum(summary?.currentBalanceTotal),
      partySummaries: (summary?.partySummaries ?? []).map((p) => ({
        ...p,
        openingBalance: asNum(p.openingBalance),
        closingBalanceInPeriod: asNum(p.closingBalanceInPeriod),
        currentBalance: asNum(p.currentBalance),
      })),
    },
  };
}

function normalizeSalesReport(res: MisSalesReportResponse): MisSalesReportResponse {
  const summary = res.summary;
  return {
    ...res,
    page: asLong(res.page),
    size: asLong(res.size),
    totalItems: asLong(res.totalItems),
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      orderCount: asLong(r.orderCount),
      cash: asNum(r.cash),
      online: asNum(r.online),
      credit: asNum(r.credit),
      subTotal: asNum(r.subTotal),
      tax: asNum(r.tax),
      discount: asNum(r.discount),
      grandTotal: asNum(r.grandTotal),
      cost: asNum(r.cost),
      profit: asNum(r.profit),
      margin: asNum(r.margin),
      refundCount: asLong(r.refundCount),
      refundAmount: asNum(r.refundAmount),
      netSales: asNum(r.netSales),
    })),
    summary: {
      count: asLong(summary?.count),
      gross: asNum(summary?.gross),
      tax: asNum(summary?.tax),
      discount: asNum(summary?.discount),
      cashTotal: asNum(summary?.cashTotal),
      onlineTotal: asNum(summary?.onlineTotal),
      creditTotal: asNum(summary?.creditTotal),
      profit: asNum(summary?.profit),
      aov: asNum(summary?.aov),
      refundCount: asLong(summary?.refundCount),
      refundAmount: asNum(summary?.refundAmount),
      netSales: asNum(summary?.netSales),
    },
  };
}

function normalizeStockReport(res: MisStockReportResponse): MisStockReportResponse {
  const summary = res.summary;
  return {
    ...res,
    page: asLong(res.page),
    size: asLong(res.size),
    totalItems: asLong(res.totalItems),
    rows: (res.rows ?? []).map((r) => ({
      ...r,
      onHand: asNum(r.onHand),
      costPrice: asNum(r.costPrice),
      sellPrice: asNum(r.sellPrice),
      costValue: asNum(r.costValue),
      sellValue: asNum(r.sellValue),
      potentialProfit: asNum(r.potentialProfit),
      soldCount: asNum(r.soldCount),
      lowStock: Boolean(r.lowStock),
      deadStock: Boolean(r.deadStock),
    })),
    summary: {
      lotCount: asLong(summary?.lotCount),
      onHandQty: asNum(summary?.onHandQty),
      costValuation: asNum(summary?.costValuation),
      sellValuation: asNum(summary?.sellValuation),
      potentialProfit: asNum(summary?.potentialProfit),
      lowStockCount: asLong(summary?.lowStockCount),
      deadStockCount: asLong(summary?.deadStockCount),
    },
  };
}

export const misApi = {
  vendorMoney: async (params: MisMoneyReportParams = {}): Promise<MisMoneyReportResponse> => {
    const query = moneyQuery(params);
    const raw = await apiClient.get<unknown>(MIS_ENDPOINTS.VENDOR_MONEY, query);
    const inner = unwrap<MisMoneyReportResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? '',
        to: params.to ?? '',
        rows: [],
        summary: emptyMoneySummary(),
        page: 0,
        size: 0,
        totalItems: 0,
      };
    }
    return normalizeMoneyReport(inner);
  },

  vendorMoneyExcel: async (
    params: MisMoneyReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = moneyQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(
      MIS_ENDPOINTS.VENDOR_MONEY_EXCEL,
      query,
      `vendor-money-mis-${from}-${to}.xlsx`,
    );
  },

  vendorMoneyPdf: async (
    params: MisMoneyReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = moneyQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(
      MIS_ENDPOINTS.VENDOR_MONEY_PDF,
      query,
      `vendor-money-mis-${from}-${to}.pdf`,
    );
  },

  customerMoney: async (params: MisMoneyReportParams = {}): Promise<MisMoneyReportResponse> => {
    const query = moneyQuery(params);
    const raw = await apiClient.get<unknown>(MIS_ENDPOINTS.CUSTOMER_MONEY, query);
    const inner = unwrap<MisMoneyReportResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? '',
        to: params.to ?? '',
        rows: [],
        summary: emptyMoneySummary(),
        page: 0,
        size: 0,
        totalItems: 0,
      };
    }
    return normalizeMoneyReport(inner);
  },

  customerMoneyExcel: async (
    params: MisMoneyReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = moneyQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(
      MIS_ENDPOINTS.CUSTOMER_MONEY_EXCEL,
      query,
      `customer-mis-${from}-${to}.xlsx`,
    );
  },

  customerMoneyPdf: async (
    params: MisMoneyReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = moneyQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(
      MIS_ENDPOINTS.CUSTOMER_MONEY_PDF,
      query,
      `customer-money-mis-${from}-${to}.pdf`,
    );
  },

  sales: async (params: MisSalesReportParams = {}): Promise<MisSalesReportResponse> => {
    const query = salesQuery(params);
    const raw = await apiClient.get<unknown>(MIS_ENDPOINTS.SALES, query);
    const inner = unwrap<MisSalesReportResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? '',
        to: params.to ?? '',
        rows: [],
        summary: {
          count: 0,
          gross: 0,
          tax: 0,
          discount: 0,
          cashTotal: 0,
          onlineTotal: 0,
          creditTotal: 0,
          profit: 0,
          aov: 0,
          refundCount: 0,
          refundAmount: 0,
          netSales: 0,
        },
        page: 0,
        size: 0,
        totalItems: 0,
      };
    }
    return normalizeSalesReport(inner);
  },

  salesExcel: async (
    params: MisSalesReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = salesQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(MIS_ENDPOINTS.SALES_EXCEL, query, `sales-mis-${from}-${to}.xlsx`);
  },

  salesPdf: async (
    params: MisSalesReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = salesQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(MIS_ENDPOINTS.SALES_PDF, query, `sales-mis-${from}-${to}.pdf`);
  },

  stock: async (params: MisStockReportParams = {}): Promise<MisStockReportResponse> => {
    const query = stockQuery(params);
    const raw = await apiClient.get<unknown>(MIS_ENDPOINTS.STOCK, query);
    const inner = unwrap<MisStockReportResponse>(raw);
    if (!inner) {
      return {
        rows: [],
        summary: {
          lotCount: 0,
          onHandQty: 0,
          costValuation: 0,
          sellValuation: 0,
          potentialProfit: 0,
          lowStockCount: 0,
          deadStockCount: 0,
        },
        page: 0,
        size: 0,
        totalItems: 0,
      };
    }
    return normalizeStockReport(inner);
  },

  stockExcel: async (
    params: MisStockReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = stockQuery(params, { paging: false });
    return downloadMisBlob(MIS_ENDPOINTS.STOCK_EXCEL, query, 'stock-mis.xlsx');
  },

  stockPdf: async (
    params: MisStockReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = stockQuery(params, { paging: false });
    return downloadMisBlob(MIS_ENDPOINTS.STOCK_PDF, query, 'stock-mis.pdf');
  },

  bankSummary: async (
    params: MisBankSummaryReportParams = {},
  ): Promise<MisBankSummaryReportResponse> => {
    const query = bankSummaryQuery(params);
    const raw = await apiClient.get<unknown>(MIS_ENDPOINTS.BANK_SUMMARY, query);
    const inner = unwrap<MisBankSummaryReportResponse>(raw);
    if (!inner) {
      return {
        from: params.from ?? null,
        to: params.to ?? null,
        openingSource: 'DERIVED',
        openingSnapshotDate: null,
        hasAdjustments: false,
        periodClosed: false,
        totals: emptyBankSummaryTotals(),
        rows: [],
        page: 0,
        size: 0,
        totalItems: 0,
      };
    }
    return normalizeBankSummary(inner);
  },

  bankSummaryExcel: async (
    params: MisBankSummaryReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = bankSummaryQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(
      MIS_ENDPOINTS.BANK_SUMMARY_EXCEL,
      query,
      `bank-summary-${from}-${to}.xlsx`,
    );
  },

  bankSummaryPdf: async (
    params: MisBankSummaryReportParams = {},
  ): Promise<{ blob: Blob; filename: string }> => {
    const query = bankSummaryQuery(params, { paging: false });
    const from = query.from ?? 'from';
    const to = query.to ?? 'to';
    return downloadMisBlob(MIS_ENDPOINTS.BANK_SUMMARY_PDF, query, `bank-summary-${from}-${to}.pdf`);
  },

  /** Freeze a period's closing stock value, which the next period then opens from. */
  closeStockPeriod: async (
    periodEnd: string,
    force = false,
  ): Promise<MisStockPeriodSnapshot | undefined> => {
    const qs = new URLSearchParams({ periodEnd, force: force ? 'true' : 'false' }).toString();
    const raw = await apiClient.post<unknown>(`${MIS_ENDPOINTS.BANK_SUMMARY_CLOSE}?${qs}`);
    return unwrap<MisStockPeriodSnapshot>(raw);
  },
};
