import type { PlanCheckoutResponse } from '../model/types.js';

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
    session: PlanCheckoutResponse,
    options?: PaymentCheckoutOptions,
  ): Promise<RazorpayPaymentSuccess>;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (
        event: string,
        handler: (response: { error?: { description?: string } }) => void,
      ) => void;
    };
  }
}

export {};
