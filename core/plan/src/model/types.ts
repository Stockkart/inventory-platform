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
