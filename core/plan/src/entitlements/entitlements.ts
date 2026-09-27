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

/** "3 of 5", or just the count when unlimited. */
export function usageOfLimit(used: number, limit: number | null): string {
  const usedLabel = used.toLocaleString('en-IN');
  return limit == null ? usedLabel : `${usedLabel} of ${limit.toLocaleString('en-IN')}`;
}

export function isAtLimit(used: number, limit: number | null): boolean {
  return limit != null && used >= limit;
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
