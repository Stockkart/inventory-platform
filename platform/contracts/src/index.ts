// Common API types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Canonical payment methods supported by Sales (checkout) and Purchase Registration.
 *
 * Single-tender:
 * - CASH / ONLINE / CREDIT
 *
 * Two-tender splits (the first tender is the primary one used for accounting
 * reporting; the credit slice, when present, is always the remainder that
 * posts to the credit ledger):
 * - CASH_ONLINE   (no credit; both legs paid now)
 * - ONLINE_CREDIT (online leg paid now, credit leg posts to ledger)
 * - CREDIT_CASH   (cash leg paid now, credit leg posts to ledger)
 */
export type PaymentMethod =
  | 'CASH'
  | 'ONLINE'
  | 'CREDIT'
  | 'CASH_ONLINE'
  | 'ONLINE_CREDIT'
  | 'CREDIT_CASH';

/**
 * Per-tender split for a payment. The sum of the three values must equal the
 * grand / invoice total (rounded to 2 decimals). The active PaymentMethod
 * dictates which buckets are allowed to be non-zero — see
 * `validatePaymentSplit` in the shared UI package.
 */
export interface PaymentSplit {
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export type {
  PlanResponse,
  UsageResponse,
  ShopPlanStatusResponse,
  PlanKind,
  PlanTier,
  PlanBillingPeriod,
  PlanFeatureEntry,
  FeatureAvailability,
} from './plan.types.js';
export {
  planKind,
  isSubscriptionPlan,
  isAddon,
  isOcrTopup,
  planBillingPeriod,
  isUsagePriced,
  planPerUnitLabel,
  planPeriodLabel,
  planPrice,
  planTierRank,
  sortedSubscriptionPlans,
  addonPlans,
  ocrTopupPlans,
  upgradePath,
  nextUpgrade,
  isUpgradeFrom,
  addonsForPlan,
  featureMatrixRows,
  featureAvailability,
  isFeatureIncluded,
  includedFeatures,
  hasFeatureMatrix,
} from './plan-catalog.js';
export { PLAN_EXPIRY_ALLOWED_PATHS, isPlanExpiryAllowedPath } from './plan-guards.js';
export type { MenuItem, MenuSection, ShopMenu, MenuSellMode } from './cafe-menu.types.js';
export type { PricingRate, PricingResponse } from './pricing.types.js';
export type {
  ReminderStatus,
  ReminderType,
  ReminderInventorySummary,
  ReminderDetail,
  ReminderNotification,
  InventoryLowEvent,
  CustomReminderInput,
  PageMeta,
} from './notification.types.js';
