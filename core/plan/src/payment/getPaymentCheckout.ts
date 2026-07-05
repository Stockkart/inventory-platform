import type { PaymentCheckoutPort } from './types.js';
import { razorpayCheckout } from './razorpayCheckout.js';

export function getPaymentCheckout(provider: string): PaymentCheckoutPort {
  switch (provider) {
    case 'razorpay':
      return razorpayCheckout;
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}
