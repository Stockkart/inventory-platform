import type {
  AddOnResponse,
  CampaignState,
  CampaignTheme,
  ReferralAttributionStatus,
  ReferralRewardStatus,
  VoucherType,
} from './types.js';

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

/** GET /admin/addons: the catalogue including hidden add-ons. */
export interface AdminAddOn extends AddOnResponse {
  id: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminVoucher {
  id: string;
  code: string;
  addOnCode: string;
  type: VoucherType;
  value: number | null;
  quantity: number;
  maxRedemptions: number | null;
  reservedCount: number;
  redemptionCount: number;
  singleUsePerShop: boolean;
  issuedToShopId: string | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
  note: string | null;
  batchId: string | null;
  createdByUserId: string | null;
  createdAt: string | null;
}

/** One chosen `code`, or `count` generated codes (`prefix`-XXXXXX) sharing every other setting. */
export interface VoucherGenerateRequest {
  code?: string;
  count?: number;
  prefix?: string;
  addOnCode: string;
  type: VoucherType;
  /** Percent or rupees; omitted for FREE_ADDON. */
  value?: number;
  quantity?: number;
  maxRedemptions?: number;
  singleUsePerShop: boolean;
  issuedToShopId?: string;
  validFrom?: string;
  validTo?: string;
  note?: string;
}

/**
 * Replaces all three fields; null clears one. Type, value and add-on are fixed after issue so
 * past redemptions stay explainable.
 */
export interface VoucherUpdateRequest {
  validTo: string | null;
  maxRedemptions: number | null;
  note: string | null;
}

export type VoucherRedemptionStatus = 'RESERVED' | 'REDEEMED' | 'RELEASED';

export interface AdminVoucherRedemption {
  id: string;
  voucherCode: string;
  shopId: string;
  orderId: string;
  addOnCode: string;
  discount: number;
  status: VoucherRedemptionStatus;
  reservedAt: string | null;
  redeemedAt: string | null;
  releasedAt: string | null;
}

/** Create or full edit; `code` is fixed after create and ignored on edit. */
export interface CampaignRequest {
  code: string;
  headline: string;
  subtext: string | null;
  upcomingHeadline: string | null;
  ctaLabel: string | null;
  ctaPath: string | null;
  theme: CampaignTheme;
  startsAt: string;
  endsAt: string;
  announceFrom: string | null;
  imminentThresholdDays: number | null;
  dismissible: boolean;
  priority: number;
}

export interface AdminCampaign extends CampaignRequest {
  id: string;
  active: boolean;
  /** What shops would see now; null when hidden (not yet announced, ended, or off). */
  state: CampaignState | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Body for the PATCH …/active endpoints. */
export interface AdminActiveRequest {
  active: boolean;
  reason: string;
}

export interface WalletAdjustmentRequest {
  /** Positive credits the wallet; negative takes from the available balance. */
  amount: number;
  reason: string;
  /** Same id on a retry, so the adjustment is applied once. */
  adjustmentId: string;
}
