export type PaymentProviderId = 'razorpay' | string;

export interface RazorpayCheckoutPayload {
  keyId: string;
  orderId: string;
}

export interface PlanCheckoutSession {
  orderId: string;
  provider: PaymentProviderId;
  amount: number;
  currency: string;
  planName: string;
  razorpay?: RazorpayCheckoutPayload;
}

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentCheckoutOptions {
  shopName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentCheckoutPort {
  openCheckout(
    session: PlanCheckoutSession,
    options?: PaymentCheckoutOptions
  ): Promise<RazorpayPaymentSuccess>;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

export {};
