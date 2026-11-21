import { isApiError } from '@inventory-platform/api-client';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import type {
  ReferralAttributionStatus,
  ReferralReviewReason,
} from '@inventory-platform/plan/types';
import { formatPlanDate } from '../ui/planDate';

export function adminErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (isApiError(error) && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Same style as every plan date ("21 Nov 2027"); a dash when there is none. */
export function formatAdminDate(iso: string | null | undefined): string {
  return formatPlanDate(iso) ?? '—';
}

const ATTRIBUTION_STATUS: Record<
  ReferralAttributionStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING_REVIEW: { label: 'Needs review', variant: 'warning' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  SELF_REFERRAL: { label: 'Self-referral', variant: 'neutral' },
  DUPLICATE: { label: 'Duplicate', variant: 'neutral' },
};

export function attributionStatusBadge(status: ReferralAttributionStatus) {
  return ATTRIBUTION_STATUS[status];
}

const REVIEW_REASON: Record<ReferralReviewReason, string> = {
  NAME_ONLY: 'Only a name was given',
  UNKNOWN_CODE: 'Code matches no shop',
  SAME_OWNER: 'Referrer has the same owner',
  SAME_EMAIL: 'Referrer has the same email',
  SAME_PHONE: 'Referrer has the same phone',
};

export function reviewReasonLabel(reason: ReferralReviewReason | null): string {
  return reason ? REVIEW_REASON[reason] : '—';
}

/** Signed rupee amount from a text field; null unless it is a non-zero number with at most 2 decimals. */
export function parseAdjustmentAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value === 0 ? null : value;
}

export function newAdjustmentId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `adj-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
