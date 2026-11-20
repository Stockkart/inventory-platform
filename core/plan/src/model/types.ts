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
  VoucherTarget,
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
  /** Null for ASSIGNED rows: no verified charge. */
  amount: number | null;
  /** Null on add-on-only orders, which have no term. */
  durationMonths: number | null;
  /** Null on order-only rows whose order recorded no method. */
  paymentMethod: string | null;
  provider?: string | null;
  providerPaymentId?: string | null;
  /** Purchase date shown; paidAt (else createdAt) for order-only rows. */
  createdAt: string;
  /** Null unless the payment was refunded. */
  refundedAt: string | null;
  planCode: string | null;
  kind: PurchaseKind;
  /** Order status; null for rows that have no order. */
  status: string | null;
  /** Null for ASSIGNED and legacy rows that kept no line snapshot. */
  items: PurchaseLine[] | null;
  subtotal: number | null;
  discountTotal: number | null;
  walletCredit: number | null;
  termStartsAt: string | null;
  termEndsAt: string | null;
  /** True when the term was derived from createdAt and the duration, not granted. */
  termEstimated: boolean;
  paymentOrderId: string | null;
  /** Money returned to the original payment method; null when nothing was. */
  refundedToPaymentMethod: number | null;
  /** Wallet credit given back on a full refund; null otherwise. */
  walletCreditReturned: number | null;
  /** Time the list is sorted by, newest first. */
  sortAt: string;
}

/** PLAN, ADD_ON_ONLY or ASSIGNED (set by an admin or the assign endpoint; no verified charge). */
export type PurchaseKind = 'PLAN' | 'ADD_ON_ONLY' | 'ASSIGNED';

/** One priced line of a past purchase, as the shop was charged. */
export interface PurchaseLine {
  type: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  discount: number | null;
  voucherCode: string | null;
  walletCredit: number | null;
  lineTotal: number | null;
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

/** GET /admin/mis/plans — platform admins only. Days are inclusive, Asia/Kolkata. */
export interface PlanMisParams {
  from: string;
  to: string;
}

export interface PlanMisResponse {
  from: string;
  to: string;
  currency: string;
  /** Orders paid in the range; refunds count on the day they happened. */
  revenue: {
    paidOrders: number;
    grossRevenue: number;
    discounts: number;
    walletCreditApplied: number;
    refundedOrders: number;
    refundedAmount: number;
    netRevenue: number;
  };
  planSales: Array<{
    planCode: string | null;
    planName: string | null;
    orders: number;
    revenue: number;
  }>;
  addOns: {
    planOrders: number;
    planOrdersWithAddOn: number;
    /** 0–100; null with no plan orders. */
    attachRatePercent: number | null;
    items: Array<{
      code: string;
      name: string | null;
      orders: number;
      units: number;
      revenue: number;
    }>;
  };
  ocrTopUps: { orders: number; units: number; credits: number; revenue: number };
  vouchers: {
    redemptions: number;
    discountValue: number;
    topCodes: Array<{ voucherCode: string; redemptions: number; discountValue: number }>;
  };
  referrals: {
    rewardsEarned: number;
    rewardCost: number;
    rewardsVoided: number;
    creditedAmount: number;
    clawedBackAmount: number;
    newShops: number;
    newRevenue: number;
    /** null with no new revenue. */
    costPercentOfNewRevenue: number | null;
  };
  wallet: {
    rewardsCredited: number;
    spentOnOrders: number;
    refundedToWallet: number;
    clawedBack: number;
    manualAdjustmentsNet: number;
    /** Current balances across all wallets, not limited to the range. */
    outstandingLiability: number;
    unrecoveredClawback: number;
  };
}
