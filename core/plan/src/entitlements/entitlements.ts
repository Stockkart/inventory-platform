import { isApiError } from '@inventory-platform/api-client';
import type {
  EntitlementErrorCode,
  EntitlementErrorDetails,
  PlanFeature,
  ShopEntitlementsResponse,
} from '@inventory-platform/plan/types';
import { FEATURE_LABELS } from '../ui/planPricing';

const ENTITLEMENT_CODES: ReadonlySet<string> = new Set<EntitlementErrorCode>([
  'FEATURE_NOT_IN_PLAN',
  'SEAT_LIMIT_REACHED',
  'OCR_QUOTA_EXCEEDED',
]);

export interface EntitlementDenial {
  code: EntitlementErrorCode;
  message: string;
  details: EntitlementErrorDetails;
}

/** The plan-limit 402 behind an error, or null for any other error. */
export function readEntitlementError(error: unknown): EntitlementDenial | null {
  if (!isApiError(error) || error.status !== 402 || !error.code) return null;
  if (!ENTITLEMENT_CODES.has(error.code)) return null;
  return {
    code: error.code as EntitlementErrorCode,
    message: error.message,
    details: (error.details ?? {}) as EntitlementErrorDetails,
  };
}

export function isPlanFeature(value: string | null | undefined): value is PlanFeature {
  return value != null && value in FEATURE_LABELS;
}

/** "Used 3 of 5 seats", or "Used 1,200 scans" when unlimited. */
export function usageOfLimit(used: number, limit: number | null, unit: string): string {
  const usedLabel = used.toLocaleString('en-IN');
  return limit == null
    ? `Used ${usedLabel} ${unit}`
    : `Used ${usedLabel} of ${limit.toLocaleString('en-IN')} ${unit}`;
}

/** "500 bought scans left" while bought scan credits remain (API `ocrTopUpRemaining`), else null. */
export function boughtScansLeftLabel(remaining: number | null | undefined): string | null {
  if (remaining == null || remaining <= 0) return null;
  return `${remaining.toLocaleString('en-IN')} bought scan${remaining === 1 ? '' : 's'} left`;
}

/** Every gated feature, split into what the plan includes and what an upgrade unlocks. */
export function splitFeatures(entitlements: ShopEntitlementsResponse): {
  included: PlanFeature[];
  locked: PlanFeature[];
} {
  const has = new Set(entitlements.features);
  const all = Object.keys(FEATURE_LABELS) as PlanFeature[];
  return {
    included: all.filter((feature) => has.has(feature)),
    locked: all.filter((feature) => !has.has(feature)),
  };
}
