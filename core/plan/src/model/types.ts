import type { PlanResponse, QuoteItem, QuoteRequest } from '@inventory-platform/contracts';

export type {
  PlanFeature,
  PlanResponse,
  UsageResponse,
  ShopPlanStatusResponse,
  QuoteAddOnLine,
  QuoteRequest,
  QuoteItemType,
  QuoteItemSource,
  QuoteItem,
  QuoteResponse,
  CampaignState,
  CampaignTheme,
  CampaignResponse,
  EntitlementSource,
  EntitlementEnforcement,
  ShopEntitlementsResponse,
  EntitlementErrorCode,
  EntitlementErrorDetails,
  AddOnBillingType,
  AddOnGrantType,
  AddOnResponse,
  VoucherRejection,
  VoucherType,
  VoucherCheckResponse,
  VoucherRejectedDetails,
} from '@inventory-platform/contracts';

export interface AssignPlanRequest {
  planId: string;
  durationMonths: number;
  paymentMethod?: string;
}

export interface PaymentConfigResponse {
  provider: string;
  publicKey: string | null;
}

export interface PlanCheckoutResponse {
  orderId: string;
  status?: string;
  provider: string;
  /** Amount charged, after discounts and wallet credit. */
  amount: number;
  currency: string;
  planName: string;
  items?: QuoteItem[];
  subtotal?: number;
  discountTotal?: number;
  walletCredit?: number;
  /** Pay before this or the order expires. */
  expiresAt?: string;
  razorpay?: {
    keyId: string;
    orderId: string;
  };
}

/** Same cart as the quote. `planId` is only for legacy plans without a catalogue code. */
export interface CreatePlanCheckoutRequest extends Partial<QuoteRequest> {
  planId?: string;
}

export interface CreatePlanCheckoutInput {
  request: CreatePlanCheckoutRequest;
  /** Same key for every retry of one cart, so a retry replays the order instead of opening another. */
  idempotencyKey: string;
}

export interface VerifyPlanPaymentRequest {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface VerifyPlanPaymentResponse {
  success: boolean;
  orderId: string;
  plan: PlanResponse | null;
}

export interface PlanTransactionResponse {
  id: string;
  shopId: string;
  planId: string;
  planName: string;
  amount: number;
  durationMonths: number;
  paymentMethod: string;
  provider?: string | null;
  providerPaymentId?: string | null;
  createdAt: string;
}

export type WalletEntrySource =
  | 'REFERRAL_REWARD'
  | 'ORDER_RESERVATION'
  | 'RESERVATION_RELEASE'
  | 'ORDER_REDEMPTION'
  | 'MANUAL_ADJUSTMENT'
  | 'CLAWBACK';

export interface WalletEntryResponse {
  source: WalletEntrySource;
  sourceId: string;
  amount: number;
  availableDelta: number;
  reservedDelta: number;
  availableAfter: number;
  reservedAfter: number;
  outstandingAfter: number;
  note?: string | null;
  createdAt: string;
}

/** GET /plans/shop/wallet */
export interface WalletResponse {
  /** Spendable at checkout now. */
  availableBalance: number;
  /** Held by checkouts that have not been paid yet. */
  reservedBalance: number;
  /** Owed back after a refunded referral; settled from future credit first. */
  outstandingClawback: number;
  /** Most recent first. */
  entries: WalletEntryResponse[];
}

export type ReferralAttributionStatus =
  | 'RESOLVED'
  | 'PENDING_REVIEW'
  | 'SELF_REFERRAL'
  | 'DUPLICATE'
  | 'REJECTED';

/** GET /referrals/me */
export interface ReferralSummaryResponse {
  referralCode: string | null;
  resolvedReferrals: number;
  pendingReviewReferrals: number;
  /** How this shop's own attribution stands; null when nobody referred it. */
  referredByStatus: ReferralAttributionStatus | null;
}

export type ReferralRewardStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CREDITING'
  | 'CREDITED'
  | 'VOID'
  | 'CLAWED_BACK';

export interface ReferralRewardResponse {
  id: string;
  refereeShopName: string | null;
  planCode: string | null;
  basePlanAmount: number;
  rewardPercent: number;
  rewardAmount: number;
  status: ReferralRewardStatus;
  /** Reaches the wallet after this, unless the purchase is refunded first. */
  holdUntil: string | null;
  creditedAt: string | null;
  createdAt: string;
}

/** GET /referrals/rewards */
export interface ReferralRewardsResponse {
  pendingAmount: number;
  creditedAmount: number;
  rewards: ReferralRewardResponse[];
}
