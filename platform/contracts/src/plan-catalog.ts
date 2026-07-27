/**
 * Readers for the plan catalog.
 *
 * Every accessor tolerates a backend that has not shipped the catalog fields
 * yet, so these are safe to call against the current `GET /plans` response.
 * Keeping the fallbacks here means call sites never branch on "did the backend
 * send this?" and never re-introduce plan-name string matching.
 */

import type {
  FeatureAvailability,
  PlanBillingPeriod,
  PlanFeatureEntry,
  PlanKind,
  PlanResponse,
} from './plan.types.js';

/** Plan names that identified add-ons before `kind` existed. */
const LEGACY_ADDON_NAMES = new Set(['Extra User Plan', 'Extra Shop Plan']);

/** A row's kind, falling back to legacy name matching, then to `'PLAN'`. */
export function planKind(plan: PlanResponse): PlanKind {
  if (plan.kind) {
    return plan.kind;
  }
  return LEGACY_ADDON_NAMES.has(plan.planName) ? 'ADDON' : 'PLAN';
}

export function isSubscriptionPlan(plan: PlanResponse): boolean {
  return planKind(plan) === 'PLAN';
}

export function isAddon(plan: PlanResponse): boolean {
  return planKind(plan) === 'ADDON';
}

export function isOcrTopup(plan: PlanResponse): boolean {
  return planKind(plan) === 'OCR_TOPUP';
}

export function planBillingPeriod(plan: PlanResponse): PlanBillingPeriod {
  return plan.billingPeriod ?? 'YEAR';
}

/** True when the row is priced at the point of use and has no headline price. */
export function isUsagePriced(plan: PlanResponse): boolean {
  return planBillingPeriod(plan) === 'USAGE';
}

/** Add-on names that priced per-user before `perUnitLabel` existed. */
const LEGACY_PER_USER_NAMES = new Set(['Extra User Plan']);

/**
 * The unit a per-unit price multiplies (e.g. `'user'`), or `null` for flat pricing.
 *
 * Falls back to the legacy name check so an existing catalog keeps rendering
 * "/user/year" until the backend sends `perUnitLabel`.
 */
export function planPerUnitLabel(plan: PlanResponse): string | null {
  if (plan.perUnitLabel !== undefined) {
    return plan.perUnitLabel;
  }
  return LEGACY_PER_USER_NAMES.has(plan.planName) ? 'user' : null;
}

/**
 * Period suffix for a price, e.g. `'/year'` or `'/user/year'`.
 * Empty for usage-priced rows, which show no period at all.
 */
export function planPeriodLabel(plan: PlanResponse): string {
  if (isUsagePriced(plan)) {
    return '';
  }
  const period = planBillingPeriod(plan) === 'MONTH' ? '/month' : '/year';
  const unit = planPerUnitLabel(plan);
  return unit ? `/${unit}${period}` : period;
}

/** Headline price, preferring `arcPrice`. `null` for usage-priced rows. */
export function planPrice(plan: PlanResponse): number | null {
  if (isUsagePriced(plan)) {
    return null;
  }
  return plan.arcPrice ?? plan.price ?? 0;
}

/**
 * Ladder position. Falls back to price so a catalog without `tierRank` still
 * orders sensibly instead of collapsing every plan to the same rank.
 */
export function planTierRank(plan: PlanResponse): number {
  if (plan.tierRank != null) {
    return plan.tierRank;
  }
  return planPrice(plan) ?? 0;
}

/** Subscription plans only, cheapest tier first. */
export function sortedSubscriptionPlans(plans: PlanResponse[]): PlanResponse[] {
  return plans.filter(isSubscriptionPlan).sort((a, b) => planTierRank(a) - planTierRank(b));
}

export function addonPlans(plans: PlanResponse[]): PlanResponse[] {
  return plans.filter(isAddon);
}

/** OCR top-up packs, smallest bundle first. */
export function ocrTopupPlans(plans: PlanResponse[]): PlanResponse[] {
  return plans
    .filter(isOcrTopup)
    .sort((a, b) => (a.ocrTopupInvoices ?? 0) - (b.ocrTopupInvoices ?? 0));
}

/**
 * Walks `linkedId` from `plan` to the top of the ladder.
 *
 * Guards against a catalog whose links form a cycle — a self-referential or
 * looped chain would otherwise hang the render. Stops on a dangling link too,
 * since a catalog edit can leave `linkedId` pointing at a deleted plan.
 */
export function upgradePath(plan: PlanResponse, plans: PlanResponse[]): PlanResponse[] {
  const byId = new Map(plans.map((p) => [p.id, p]));
  const path: PlanResponse[] = [];
  const seen = new Set<string>([plan.id]);

  let nextId = plan.linkedId ?? null;
  while (nextId && !seen.has(nextId)) {
    const next = byId.get(nextId);
    if (!next) {
      break;
    }
    path.push(next);
    seen.add(nextId);
    nextId = next.linkedId ?? null;
  }

  return path;
}

/** The single next tier up, or `null` at the top of the ladder. */
export function nextUpgrade(plan: PlanResponse, plans: PlanResponse[]): PlanResponse | null {
  return upgradePath(plan, plans)[0] ?? null;
}

/** True when `candidate` sits above `current` on the ladder. */
export function isUpgradeFrom(candidate: PlanResponse, current: PlanResponse | null): boolean {
  if (!current || candidate.id === current.id) {
    return false;
  }
  return planTierRank(candidate) > planTierRank(current);
}

/** Add-ons attachable to `plan`; a row with no scoping applies to every plan. */
export function addonsForPlan(plans: PlanResponse[], plan: PlanResponse | null): PlanResponse[] {
  return addonPlans(plans).filter((addon) => {
    if (!addon.appliesToPlanIds || addon.appliesToPlanIds.length === 0) {
      return true;
    }
    return plan != null && addon.appliesToPlanIds.includes(plan.id);
  });
}

/**
 * Distinct feature rows across every plan, in display order.
 *
 * Unioning keys means a feature present on only one tier still gets a matrix
 * row (showing as excluded elsewhere) rather than disappearing.
 */
export function featureMatrixRows(plans: PlanResponse[]): Array<{ key: string; label: string }> {
  const rows = new Map<string, { key: string; label: string; sortOrder: number }>();

  plans.forEach((plan) => {
    (plan.features ?? []).forEach((feature, index) => {
      const existing = rows.get(feature.key);
      const sortOrder = feature.sortOrder ?? Number.MAX_SAFE_INTEGER - 1000 + index;
      if (!existing || sortOrder < existing.sortOrder) {
        rows.set(feature.key, { key: feature.key, label: feature.label, sortOrder });
      }
    });
  });

  return [...rows.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ key, label }) => ({ key, label }));
}

/** How `featureKey` is provisioned on `plan`; unlisted features are excluded. */
export function featureAvailability(plan: PlanResponse, featureKey: string): FeatureAvailability {
  const match = (plan.features ?? []).find((feature) => feature.key === featureKey);
  return match?.availability ?? 'EXCLUDED';
}

export function isFeatureIncluded(plan: PlanResponse, featureKey: string): boolean {
  return featureAvailability(plan, featureKey) !== 'EXCLUDED';
}

/** Features a plan actually provides, for card-style lists. */
export function includedFeatures(plan: PlanResponse): PlanFeatureEntry[] {
  return (plan.features ?? []).filter((feature) => feature.availability !== 'EXCLUDED');
}

/** True once the backend ships per-plan capability data. */
export function hasFeatureMatrix(plans: PlanResponse[]): boolean {
  return plans.some((plan) => (plan.features ?? []).length > 0);
}
