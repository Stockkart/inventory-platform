/** Vendor money MIS transaction types — mirrors `MisVendorTxnType` on the backend. */
export const MIS_VENDOR_TXN_TYPE = {
  PURCHASE: 'PURCHASE',
  RETURN: 'RETURN',
  PAYMENT: 'PAYMENT',
  CREDIT_CHARGE: 'CREDIT_CHARGE',
  /** Synthetic carried-forward balance row. Returned by the API, never filtered on. */
  OPENING: 'OPENING',
} as const;

export type MisVendorTxnType = (typeof MIS_VENDOR_TXN_TYPE)[keyof typeof MIS_VENDOR_TXN_TYPE];

export const MIS_VENDOR_TXN_TYPE_LABEL: Record<MisVendorTxnType, string> = {
  PURCHASE: 'Purchase',
  RETURN: 'Return',
  PAYMENT: 'Payment',
  CREDIT_CHARGE: 'Credit charge',
  OPENING: 'Opening',
};

export const FILTERABLE_MIS_VENDOR_TXN_TYPES: readonly MisVendorTxnType[] = [
  MIS_VENDOR_TXN_TYPE.PURCHASE,
  MIS_VENDOR_TXN_TYPE.PAYMENT,
  MIS_VENDOR_TXN_TYPE.RETURN,
  MIS_VENDOR_TXN_TYPE.CREDIT_CHARGE,
];

/** Customer money MIS transaction types — mirrors `MisCustomerTxnType`. */
export const MIS_CUSTOMER_TXN_TYPE = {
  SALE: 'SALE',
  COLLECTION: 'COLLECTION',
  REFUND: 'REFUND',
  CREDIT_CHARGE: 'CREDIT_CHARGE',
  OPENING: 'OPENING',
} as const;

export type MisCustomerTxnType = (typeof MIS_CUSTOMER_TXN_TYPE)[keyof typeof MIS_CUSTOMER_TXN_TYPE];

export const MIS_CUSTOMER_TXN_TYPE_LABEL: Record<MisCustomerTxnType, string> = {
  SALE: 'Sale',
  COLLECTION: 'Collection',
  REFUND: 'Refund',
  CREDIT_CHARGE: 'Credit charge',
  OPENING: 'Opening',
};

export const FILTERABLE_MIS_CUSTOMER_TXN_TYPES: readonly MisCustomerTxnType[] = [
  MIS_CUSTOMER_TXN_TYPE.SALE,
  MIS_CUSTOMER_TXN_TYPE.COLLECTION,
  MIS_CUSTOMER_TXN_TYPE.REFUND,
  MIS_CUSTOMER_TXN_TYPE.CREDIT_CHARGE,
];

/** Money-column filters — mirrors `MisMoneyFilter`. */
export const MIS_MONEY_FILTER = {
  ALL: 'ALL',
  HAS_CASH: 'HAS_CASH',
  HAS_ONLINE: 'HAS_ONLINE',
  HAS_CREDIT: 'HAS_CREDIT',
  FULLY_PAID: 'FULLY_PAID',
  MIXED: 'MIXED',
} as const;

export type MisMoneyFilter = (typeof MIS_MONEY_FILTER)[keyof typeof MIS_MONEY_FILTER];

export const MIS_MONEY_FILTER_LABEL: Record<MisMoneyFilter, string> = {
  ALL: 'All money types',
  HAS_CASH: 'Has cash',
  HAS_ONLINE: 'Has online',
  HAS_CREDIT: 'Has credit',
  FULLY_PAID: 'Fully paid',
  MIXED: 'Mixed',
};

export const MIS_MONEY_FILTERS: readonly MisMoneyFilter[] = Object.values(MIS_MONEY_FILTER);

export interface MisMoneyRow {
  txnId: string;
  txnType: string;
  txnTypeLabel: string;
  partyId: string;
  partyName: string;
  txnDate: string;
  postedAt: string | null;
  refNo: string | null;
  againstTxnId: string | null;
  againstRefNo: string | null;
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
  balanceAfter: number;
  sourceType: string | null;
  sourceId: string | null;
  opening: boolean;
}

export interface MisMoneyPartySummary {
  partyId: string;
  partyName: string;
  openingBalance: number;
  closingBalanceInPeriod: number;
  currentBalance: number;
}

export interface MisMoneySummary {
  openingBalanceTotal: number;
  periodCashTotal: number;
  periodOnlineTotal: number;
  periodCreditTotal: number;
  periodPurchaseOrSaleTotal: number;
  currentBalanceTotal: number;
  partySummaries: MisMoneyPartySummary[];
}

export interface MisMoneyReportResponse {
  from: string;
  to: string;
  summary: MisMoneySummary;
  rows: MisMoneyRow[];
  page: number;
  size: number;
  totalItems: number;
}

export interface MisMoneyReportParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  q?: string;
  vendorId?: string;
  customerId?: string;
  txnTypes?: string | string[];
  moneyFilter?: MisMoneyFilter;
}

export interface MisSalesRow {
  date: string;
  orderCount: number;
  cash: number;
  online: number;
  credit: number;
  subTotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  cost: number;
  profit: number;
  margin: number;
  refundCount: number;
  refundAmount: number;
  netSales: number;
}

export interface MisSalesSummary {
  count: number;
  gross: number;
  tax: number;
  discount: number;
  cashTotal: number;
  onlineTotal: number;
  creditTotal: number;
  profit: number;
  aov: number;
  refundCount: number;
  refundAmount: number;
  netSales: number;
}

export interface MisSalesReportResponse {
  from: string;
  to: string;
  summary: MisSalesSummary;
  rows: MisSalesRow[];
  page: number;
  size: number;
  totalItems: number;
}

export interface MisSalesReportParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  q?: string;
  customerId?: string;
  paymentMethod?: string;
}

export interface MisStockRow {
  inventoryId: string;
  productId: string;
  name: string;
  barcode: string | null;
  lotId: string | null;
  onHand: number;
  threshold: number | null;
  costPrice: number;
  sellPrice: number;
  costValue: number;
  sellValue: number;
  potentialProfit: number;
  lowStock: boolean;
  deadStock: boolean;
  soldCount: number;
}

export interface MisStockSummary {
  lotCount: number;
  onHandQty: number;
  costValuation: number;
  sellValuation: number;
  potentialProfit: number;
  lowStockCount: number;
  deadStockCount: number;
}

export interface MisStockReportResponse {
  summary: MisStockSummary;
  rows: MisStockRow[];
  page: number;
  size: number;
  totalItems: number;
}

export interface MisStockReportParams {
  page?: number;
  size?: number;
  q?: string;
  lowStockOnly?: boolean;
  deadStockOnly?: boolean;
}
