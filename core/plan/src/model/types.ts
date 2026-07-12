import type { PlanResponse } from '@inventory-platform/contracts';

export type {
  PlanResponse,
  UsageResponse,
  ShopPlanStatusResponse,
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
