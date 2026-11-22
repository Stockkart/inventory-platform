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
  | 'ADVANCED_ACCESS_CONTROL'
  | 'SHOP_BRANDING'
  | 'PRIORITY_SUPPORT';

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
  /** Staff roles the plan allows. Null = no cap. */
  roleLimit?: number | null;
  /** Users on biometric attendance. Null = no cap. */
  attendanceUserLimit?: number | null;
  features?: PlanFeature[] | null;
  /** Marketing highlight chosen by the backend, e.g. MOST_POPULAR. */
  badge?: string | null;
  /** Struck-through anchor shown beside arcPrice. Display only, never charged; null on legacy plans. */
  listPrice?: number | null;
  /** Length of the free trial in days (API `plan.trial-days`). Absent on older APIs. */
  trialDays?: number | null;
  /** Monthly billing limit as the API words it, e.g. "Unlimited" or "₹1.5L". */
  billingLimitLabel?: string | null;
  /** False for legacy add-on rows that must not be offered as a plan. Absent = selectable. */
  selectable?: boolean | null;
  /** Length of the free trial in days (API `plan.trial-days`). Absent on older APIs. */
  trialDays?: number | null;
}

export interface UsageResponse {
  shopId: string;
  month: string;
  billingAmountUsed: number;
  billCountUsed: number;
  smsUsed: number;
  whatsappUsed: number;
}

/** What a plan card offers the shop; decided by the API (inventory-api `PlanOptions`). */
export type PlanAction = 'CURRENT' | 'UPGRADE' | 'BUY';

/** One catalogue plan's card on plan status. Absent on older APIs. */
export interface PlanOptionResponse {
  planId: string;
  planCode: string | null;
  action: PlanAction;
  /** False while the paid plan has days left and this is a different plan (PLAN_CHANGE_NOT_ALLOWED). */
  actionAvailable: boolean;
  /** Why the action is not available yet; shown as is. */
  unavailableReason: string | null;
  /** When the action becomes available (the paid plan's expiry). */
  availableFrom: string | null;
}

export interface ShopPlanStatusResponse {
  shopId: string;
  planId: string | null;
  plan: PlanResponse | null;
  planExpiryDate: string | null;
  trial: boolean;
  /** Length of the free trial in days (API `plan.trial-days`). Absent on older APIs. */
  trialDays?: number | null;
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
  /** True while the shop has a paid term, so add-ons can be bought on their own (API decides). */
  canBuyAddOnsAlone?: boolean;
  /** True only when the shop could still start a free trial. Absent on older APIs: no trial badge. */
  trialAvailable?: boolean;
  /** What each catalogue plan's card offers, in catalogue order. Absent on older APIs. */
  planOptions?: PlanOptionResponse[] | null;
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
  /** Bought scan credits still left; used after the monthly scans. Absent on older APIs. */
  ocrTopUpRemaining?: number | null;
  expiresAt: string | null;
  /** All seats are taken (API decides). Absent on older APIs: then no warning is shown. */
  seatLimitReached?: boolean;
  /** Included scans and purchased scan credits are used up (API decides). Absent on older APIs. */
  ocrLimitReached?: boolean;
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

/**
 * Cart to price via POST /plans/orders/quote. Leave `planCode` out and send `addOns` for an
 * add-on-only order, priced against the shop's current paid plan.
 */
export interface QuoteRequest {
  planCode?: string;
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
  /** unitPrice × quantity, before discounts (server-side). */
  grossAmount: number;
  discount: number;
  lineTotal: number;
  itemSource: QuoteItemSource;
  /** Voucher that added or discounted this line. */
  voucherCode?: string | null;
  /** Wallet credit spent on this line; the line is paid `lineTotal - walletCredit`. */
  walletCredit?: number | null;
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
  /**
   * Whether this cart (GET /plans/addons?planCode=X) or this shop's top-up (GET
   * /plans/shop/addon-options) can take the add-on; null on the plain catalogue.
   */
  eligible?: boolean | null;
  /** Why not, in words the shop can read; null when eligible. */
  ineligibleReason?: string | null;
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
  /** True for an add-on-only cart: no PLAN line, priced against the shop's current paid plan. */
  addOnOnly?: boolean;
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  walletCredit: number;
  /** Prices include tax; no tax line is itemised yet. */
  taxInclusive: boolean;
  grandTotal: number;
  currency: string;
  /** 0 on an add-on-only cart, which has no term; never show a duration for it. */
  durationMonths: number;
  /**
   * Add-on-only carts: when the annual add-ons end (ISO instant; full price, no proration). Null or
   * absent otherwise, and on an API that predates the field.
   */
  termEndsAt?: string | null;
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
