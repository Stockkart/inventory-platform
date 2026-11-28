import {
  PaymentDismissedError,
  type PaymentCheckoutPort,
  type RazorpayPaymentSuccess,
} from './types.js';
import { ensureRazorpayLoaded } from './razorpayScript.js';

export const razorpayCheckout: PaymentCheckoutPort = {
  async openCheckout(session, options) {
    const payload = session.razorpay;
    if (!payload?.keyId || !payload.orderId) {
      throw new Error('Missing Razorpay checkout details');
    }

    await ensureRazorpayLoaded();

    return new Promise((resolve, reject) => {
      // A failed attempt keeps Razorpay's window open so the shopper can try another method;
      // only closing the window ends this checkout.
      let lastFailure: string | null = null;
      const rzp = new window.Razorpay!({
        key: payload.keyId,
        order_id: payload.orderId,
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: options?.shopName ?? 'StockKart',
        description: session.planName,
        prefill: {
          email: options?.customerEmail,
          contact: options?.customerPhone,
        },
        theme: { color: '#2563eb' },
        handler: (response: RazorpayPaymentSuccess) => resolve(response),
        modal: {
          ondismiss: () => reject(new PaymentDismissedError(lastFailure)),
        },
      });

      rzp.on('payment.failed', (response) => {
        lastFailure = response.error?.description ?? 'Payment failed. Please try again.';
      });

      rzp.open();
    });
  },
};
