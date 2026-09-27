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
  /** Struck-through anchor shown beside arcPrice. Display only, never charged; null on legacy plans. */
  listPrice?: number | null;
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

/** Why a shop has its entitlements. LEGACY_GRANDFATHERED keeps every feature until migrated. */
export type EntitlementSource = 'PLAN' | 'TRIAL' | 'LEGACY_GRANDFATHERED';

/** OFF and LOG_ONLY never block; only ENFORCE does. */
export type EntitlementEnforcement = 'OFF' | 'LOG_ONLY' | 'ENFORCE';

/** GET /plans/shop/entitlements. Null limits mean unlimited. */
export interface ShopEntitlementsResponse {
  planId: string | null;
  planCode: string | null;
  source: EntitlementSource;
  features: PlanFeature[];
  enforcement: EntitlementEnforcement;
  userLimit: number | null;
  userCount: number;
  ocrLimit: number | null;
  ocrUsed: number;
  expiresAt: string | null;
}

/** `code` on a 402 when the plan does not allow an action. */
export type EntitlementErrorCode =
  | 'FEATURE_NOT_IN_PLAN'
  | 'SEAT_LIMIT_REACHED'
  | 'OCR_QUOTA_EXCEEDED';

/** `details` on an entitlement 402; fields depend on the code. */
export interface EntitlementErrorDetails {
  source?: EntitlementSource;
  currentPlanCode?: string;
  feature?: PlanFeature;
  requiredPlanCode?: string;
  userLimit?: number;
  userCount?: number;
  ocrLimit?: number;
  ocrUsed?: number;
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
  /** Voucher that added or discounted this line. */
  voucherCode?: string | null;
}

export type AddOnBillingType = 'ANNUAL' | 'ONE_TIME';
export type AddOnGrantType = 'FEATURE' | 'SEATS' | 'SMS' | 'OCR_CREDITS';

/** Add-on sold at checkout, from GET /plans/addons. */
export interface AddOnResponse {
  code: string;
  name: string;
  description: string | null;
  price: number;
  billingType: AddOnBillingType;
  grantType: AddOnGrantType;
  grantsFeature: PlanFeature | null;
  grantsQuantity: number | null;
  stackable: boolean;
  maxQuantity: number | null;
  displayOrder: number | null;
}

export type VoucherRejection =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'WRONG_SHOP'
  | 'NOT_APPLICABLE_TO_CART'
  | 'ALREADY_REDEEMED';

export type VoucherType = 'FREE_ADDON' | 'PERCENT_OFF' | 'FLAT_OFF';

/** GET /plans/vouchers/validate. Whether a code is usable; the money comes from the quote. */
export interface VoucherCheckResponse {
  code: string;
  valid: boolean;
  reason: VoucherRejection | null;
  addOnCode: string | null;
  type: VoucherType | null;
  value: number | null;
  quantity: number | null;
  validTo: string | null;
}

/** `details` on a VOUCHER_REJECTED error from quote or checkout. */
export interface VoucherRejectedDetails {
  voucherCode?: string;
  reason?: VoucherRejection;
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

/** Derived on the server from the campaign dates (Asia/Kolkata calendar days). */
export type CampaignState = 'UPCOMING' | 'STARTING_SOON' | 'LIVE' | 'ENDING_SOON';

export type CampaignTheme = 'DEFAULT' | 'MONSOON' | 'SUMMER' | 'DIWALI' | 'NEW_YEAR';

/** The one sale banner to show, from GET /campaigns/active (null when none). */
export interface CampaignResponse {
  code: string;
  /** Authoritative. The client only ticks a countdown between refetches. */
  state: CampaignState;
  /** Teaser headline before the start, live headline after. */
  headline: string;
  subtext: string | null;
  ctaLabel: string | null;
  /** App-relative path, e.g. /plans. */
  ctaPath: string | null;
  theme: CampaignTheme;
  startsAt: string;
  endsAt: string;
  dismissible: boolean;
  /** Server clock at response time; corrects the countdown for device clock skew. */
  serverNow: string;
  /** When state next changes; refetch then instead of recomputing state locally. */
  nextTransitionAt: string;
}
