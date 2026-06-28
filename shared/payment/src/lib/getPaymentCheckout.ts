import type { PaymentCheckoutPort, PaymentProviderId } from './types';
import { razorpayCheckout } from './razorpayCheckout';

export function getPaymentCheckout(provider: PaymentProviderId): PaymentCheckoutPort {
  switch (provider) {
    case 'razorpay':
      return razorpayCheckout;
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}
