/** Plan catalog and shop subscription status (API response shapes). */

/**
 * What a catalog row represents. `GET /plans` returns plans, add-ons and OCR
 * top-ups in one list; this discriminates them.
 *
 * Before this field existed the frontend identified add-ons by matching
 * `planName` against literals ('Extra User Plan', 'Extra Shop Plan'), which
 * broke whenever the catalog was renamed. Prefer `kind` and treat a missing
 * value as `'PLAN'`.
 */
export type PlanKind = 'PLAN' | 'ADDON' | 'OCR_TOPUP';

/** Subscription tiers, cheapest first. Compare with `tierRank`, not this union. */
export type PlanTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

/**
 * How a feature is provisioned on a tier.
 *
 * `LIMITED` / `ADVANCED` exist because some features are graded rather than
 * on/off — Access Control is absent on Starter, limited on Professional and
 * advanced on Enterprise.
 */
export type FeatureAvailability = 'EXCLUDED' | 'INCLUDED' | 'LIMITED' | 'ADVANCED';

/** How an add-on is charged. `USAGE` has no fixed price (e.g. pay-per-SMS). */
export type PlanBillingPeriod = 'YEAR' | 'MONTH' | 'USAGE';

/**
 * One row of a plan's capability list.
 *
 * The label ships from the backend so the comparison matrix can gain features
 * without a frontend release. `key` is the stable identity — it is what the
 * matrix aligns rows on across plans, and what entitlement checks should use.
 */
export interface PlanFeatureEntry {
  key: string;
  label: string;
  availability: FeatureAvailability;
  /** Optional ordering hint; rows without one sort after those with one. */
  sortOrder?: number | null;
}

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
  /**
   * ID of the next higher plan — the forward pointer of the tier ladder.
   * `null` on the top tier. Walk it with `upgradePath()` to offer an upgrade.
   */
  linkedId: string | null;
  bestFor: string | null;

  // ---------------------------------------------------------------------------
  // Catalog fields. All optional so a backend that has not shipped them yet
  // still satisfies this type and the UI degrades to its previous behaviour.
  // ---------------------------------------------------------------------------

  /** Defaults to `'PLAN'` when absent. */
  kind?: PlanKind | null;
  tier?: PlanTier | null;
  /** Position on the ladder, ascending. Drives ordering and upgrade/downgrade comparisons. */
  tierRank?: number | null;
  /** Roles this tier covers, e.g. `['Owner', 'Manager', 'Cashier']`. */
  userRoles?: string[] | null;
  /** Invoices per month included in the tier's OCR allowance. `null` = none. */
  ocrInvoiceLimit?: number | null;
  /** Invoices granted by a one-off pack. Only meaningful when `kind` is `'OCR_TOPUP'`. */
  ocrTopupInvoices?: number | null;
  /** Defaults to `'YEAR'` when absent. `USAGE` rows price at the point of use, so `price` is 0. */
  billingPeriod?: PlanBillingPeriod | null;
  /**
   * Unit a per-unit price multiplies, e.g. `'user'` renders "₹500/user/year".
   * `null` for flat pricing. Replaces matching on the name 'Extra User Plan'.
   */
  perUnitLabel?: string | null;
  /**
   * Plans an add-on can be attached to. `null` or absent means any plan.
   * Only meaningful when `kind` is `'ADDON'`.
   */
  appliesToPlanIds?: string[] | null;
  /** Capability list backing the comparison matrix. */
  features?: PlanFeatureEntry[] | null;
  /** Free days granted on first subscribe. Drives the trial badge. */
  trialDays?: number | null;
}

export interface UsageResponse {
  shopId: string;
  month: string;
  billingAmountUsed: number;
  billCountUsed: number;
  smsUsed: number;
  whatsappUsed: number;
  /** OCR invoices consumed this month. Counts against `PlanResponse.ocrInvoiceLimit`. */
  ocrInvoicesUsed?: number | null;
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
  /** Length of the granted trial in days. Display only; expiry is decided by the backend. */
  trialDaysTotal?: number | null;
  /** Whole days left in the trial; `0` once expired. Display only. */
  trialDaysRemaining?: number | null;
  ocrLimitReached?: boolean | null;
  /** Next tier up from the current plan, resolved by the backend for convenience. */
  upgradePlan?: PlanResponse | null;
}
