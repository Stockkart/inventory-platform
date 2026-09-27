/** Plan catalog and shop subscription status (API response shapes). */

/** Gated capability a plan includes. Features every plan has are not listed. */
export type PlanFeature =
  | 'CREDIT_BALANCE'
  | 'ACCOUNTING'
  | 'BARCODE_GENERATOR'
  | 'LOW_STOCK_NOTIFICATION'
  | 'MARKETING'
  | 'SALARY'
  | 'BIOMETRIC_ATTENDANCE'
  | 'ADVANCED_ACCESS_CONTROL';

export interface PlanResponse {
  id: string;
  planName: string;
  price: number;
  arcPrice: number;
  billingLimit: number | null;
  billCountLimit: number | null;
  smsLimit: number | null;
  whatsappLimit: number | null;
  userLimit: number | null;
  unlimited: boolean;
  linkedId: string | null;
  bestFor: string | null;
  /** Catalogue fields; absent on legacy plans and on older API versions. */
  code?: string | null;
  displayOrder?: number | null;
  /** OCR invoices included per month. */
  ocrLimit?: number | null;
  features?: PlanFeature[] | null;
  /** Marketing highlight chosen by the backend, e.g. MOST_POPULAR. */
  badge?: string | null;
}

export interface UsageResponse {
  shopId: string;
  month: string;
  billingAmountUsed: number;
  billCountUsed: number;
  smsUsed: number;
  whatsappUsed: number;
}

export interface ShopPlanStatusResponse {
  shopId: string;
  planId: string | null;
  plan: PlanResponse | null;
  planExpiryDate: string | null;
  trial: boolean;
  trialExpired: boolean;
  /** True when planExpiryDate is in the past (trial or paid subscription). */
  planExpired: boolean;
  currentUsage: UsageResponse;
  suggestedPlan: PlanResponse | null;
  billingLimitReached: boolean;
  billCountLimitReached: boolean;
  smsLimitReached: boolean;
  whatsappLimitReached: boolean;
  userLimitReached: boolean;
}

export interface QuoteAddOnLine {
  code: string;
  quantity: number;
}

/** Cart to price via POST /plans/orders/quote. */
export interface QuoteRequest {
  planCode: string;
  /** Plans are sold yearly; omit or send 12. */
  durationMonths?: number;
  addOns?: QuoteAddOnLine[];
  voucherCodes?: string[];
  applyWalletCredit?: boolean;
}

export type QuoteItemType = 'PLAN' | 'ADDON' | 'OCR_TOPUP';
export type QuoteItemSource = 'MANUAL' | 'VOUCHER';

export interface QuoteItem {
  type: QuoteItemType;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  itemSource: QuoteItemSource;
}

/**
 * Server-priced cart for display. Render these totals as-is; checkout re-prices server-side, so
 * never compute or send a total from the client.
 */
export interface QuoteResponse {
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  walletCredit: number;
  /** Prices include tax; no tax line is itemised yet. */
  taxInclusive: boolean;
  grandTotal: number;
  currency: string;
  durationMonths: number;
  pricingVersion: number;
  quotedAt: string;
  expiresAt: string;
}
