import type { PlanResponse, QuoteItem, QuoteRequest } from '@inventory-platform/contracts';

export type {
  PlanFeature,
  PlanResponse,
  UsageResponse,
  ShopPlanStatusResponse,
  PlanAction,
  PlanOptionResponse,
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

export interface PaymentConfigResponse {
  provider: string;
  publicKey: string | null;
}

/** Order phase from the API, grouping its statuses for the screen. */
export type OrderPhase = 'AWAITING_PAYMENT' | 'PROCESSING' | 'FULFILLED' | 'FAILED' | 'ENDED';

export interface PlanCheckoutResponse {
  orderId: string;
  status?: string;
  /** Absent on older APIs; then `status` decides (checkout/orderState.ts). */
  phase?: OrderPhase;
  provider: string;
  /** Amount charged, after discounts and wallet credit. */
  amount: number;
  currency: string;
  planName: string;
  /** True when the order buys add-ons only, on top of the shop's current paid plan. */
  addOnOnly?: boolean;
  /** Add-on-only orders: when the annual add-ons end (ISO instant). Absent on older APIs. */
  termEndsAt?: string | null;
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

/** POST /plans/orders/{orderId}/cancel */
export interface PlanOrderStatusResponse {
  orderId: string;
  status: string;
  phase?: OrderPhase;
}

export interface VerifyPlanPaymentResponse {
  success: boolean;
  orderId: string;
  /** Order status after verification (see checkout/orderState.ts). Absent on older APIs. */
  status?: string;
  phase?: OrderPhase;
  plan: PlanResponse | null;
}

export interface PlanTransactionResponse {
  id: string;
  shopId: string;
  planId: string;
  planName: string;
  amount: number;
  /** Null on add-on-only orders, which have no term. */
  durationMonths: number | null;
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
  | 'CLAWBACK'
  | 'ORDER_REFUND';

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
