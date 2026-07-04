import type {
  PaymentCheckoutOptions,
  PaymentCheckoutPort,
  PlanCheckoutSession,
  RazorpayPaymentSuccess,
} from './types';
import { ensureRazorpayLoaded } from './razorpayScript';

export const razorpayCheckout: PaymentCheckoutPort = {
  async openCheckout(
    session: PlanCheckoutSession,
    options?: PaymentCheckoutOptions
  ): Promise<RazorpayPaymentSuccess> {
    const payload = session.razorpay;
    if (!payload?.keyId || !payload.orderId) {
      throw new Error('Missing Razorpay checkout details');
    }

    await ensureRazorpayLoaded();

    return new Promise((resolve, reject) => {
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
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      });

      rzp.on('payment.failed', (response) => {
        const description =
          response.error?.description ?? 'Payment failed. Please try again.';
        reject(new Error(description));
      });

      rzp.open();
    });
  },
};
