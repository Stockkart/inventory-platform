import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlanCheckoutResponse } from '../model/types';

vi.mock('./razorpayScript.js', () => ({ ensureRazorpayLoaded: () => Promise.resolve() }));

import { razorpayCheckout } from './razorpayCheckout';
import { PaymentDismissedError } from './types';

type Options = {
  handler: (r: unknown) => void;
  modal: { ondismiss: () => void };
};

/** A fake Razorpay window the test drives: fail, succeed or close. */
function fakeRazorpay() {
  const window: { options?: Options; failed?: (r: unknown) => void } = {};
  vi.stubGlobal('window', {
    Razorpay: function Razorpay(this: unknown, options: Options) {
      window.options = options;
      return {
        open: () => undefined,
        on: (_event: string, cb: (r: unknown) => void) => {
          window.failed = cb;
        },
      };
    },
  });
  return window;
}

const session = {
  orderId: 'o1',
  provider: 'razorpay',
  amount: 100,
  currency: 'INR',
  planName: 'Starter',
  razorpay: { keyId: 'k', orderId: 'rzp1' },
} as PlanCheckoutResponse;

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('razorpayCheckout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the window open after a failed attempt so a retry inside it can still pay', async () => {
    const rzp = fakeRazorpay();
    const result = razorpayCheckout.openCheckout(session);
    await flush();
    rzp.failed?.({ error: { description: 'Card declined' } });
    const paid = { razorpay_payment_id: 'p', razorpay_order_id: 'rzp1', razorpay_signature: 's' };
    rzp.options?.handler(paid);
    await expect(result).resolves.toEqual(paid);
  });

  it('reports closing the window as a dismissal, with the last failure', async () => {
    const rzp = fakeRazorpay();
    const result = razorpayCheckout.openCheckout(session);
    await flush();
    rzp.failed?.({ error: { description: 'Card declined' } });
    rzp.options?.modal.ondismiss();
    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaymentDismissedError);
    expect((error as PaymentDismissedError).lastFailure).toBe('Card declined');
  });

  it('reports a plain close with no failure', async () => {
    const rzp = fakeRazorpay();
    const result = razorpayCheckout.openCheckout(session);
    await flush();
    rzp.options?.modal.ondismiss();
    const error = await result.catch((e: unknown) => e);
    expect((error as PaymentDismissedError).lastFailure).toBeNull();
    expect((error as Error).message).toBe('Payment cancelled');
  });
});
