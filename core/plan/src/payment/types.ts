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

/**
 * The shopper closed the payment window without paying. `lastFailure` is the gateway's message
 * when an attempt inside the window failed first.
 */
export class PaymentDismissedError extends Error {
  constructor(readonly lastFailure: string | null = null) {
    super(lastFailure ?? 'Payment cancelled');
    this.name = 'PaymentDismissedError';
  }
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
