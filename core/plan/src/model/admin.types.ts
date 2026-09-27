import type { ReferralAttributionStatus, ReferralRewardStatus } from './types.js';

/** Platform admin API shapes (/admin/**). Every mutating call needs a reason, kept in the audit log. */

export type ReferralReviewReason =
  | 'NAME_ONLY'
  | 'UNKNOWN_CODE'
  | 'SAME_OWNER'
  | 'SAME_EMAIL'
  | 'SAME_PHONE';

export interface AdminReferralAttribution {
  id: string;
  refereeShopId: string;
  refereeShopName: string | null;
  referrerShopId: string | null;
  referrerShopName: string | null;
  referrerCodeUsed: string | null;
  rawReferredByName: string | null;
  status: ReferralAttributionStatus;
  reviewReason: ReferralReviewReason | null;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  rejectionReason: string | null;
}

export interface AdminReferralReward {
  id: string;
  referrerShopId: string;
  referrerShopName: string | null;
  refereeShopId: string;
  refereeShopName: string | null;
  orderId: string;
  planCode: string | null;
  basePlanAmount: number;
  rewardPercent: number;
  rewardAmount: number;
  status: ReferralRewardStatus;
  holdUntil: string | null;
  approvedAt: string | null;
  creditedAt: string | null;
  voidedAt: string | null;
  clawedBackAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
}

export interface ReferralApprovalRequest {
  /** Required when the referral has no referring shop yet (name only or unknown code). */
  referrerShopId?: string;
  reason: string;
}

export interface WalletAdjustmentRequest {
  /** Positive credits the wallet; negative takes from the available balance. */
  amount: number;
  reason: string;
  /** Same id on a retry, so the adjustment is applied once. */
  adjustmentId: string;
}
