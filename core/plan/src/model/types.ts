// Plan types
export interface PlanResponse {
  id: string;
  planName: string;
  price: number;
  arcPrice: number;
  billingLimit: number | null;
  billCountLimit: number | null;
  smsLimit: number | null;
  whatsappLimit: number | null;
  userLimit: number | null;
  unlimited: boolean;
  linkedId: string | null;
  bestFor: string | null;
}

export interface UsageResponse {
  shopId: string;
  month: string;
  billingAmountUsed: number;
  billCountUsed: number;
  smsUsed: number;
  whatsappUsed: number;
}

export interface ShopPlanStatusResponse {
  shopId: string;
  planId: string | null;
  plan: PlanResponse | null;
  planExpiryDate: string | null;
  trial: boolean;
  trialExpired: boolean;
  /** True when planExpiryDate is in the past (trial or paid subscription). */
  planExpired: boolean;
  currentUsage: UsageResponse;
  suggestedPlan: PlanResponse | null;
  billingLimitReached: boolean;
  billCountLimitReached: boolean;
  smsLimitReached: boolean;
  whatsappLimitReached: boolean;
  userLimitReached: boolean;
}

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
  provider: string;
  amount: number;
  currency: string;
  planName: string;
  razorpay?: {
    keyId: string;
    orderId: string;
  };
}

export interface CreatePlanCheckoutRequest {
  planId: string;
  durationMonths?: number;
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

