import type { QuoteResponse } from '@inventory-platform/plan/types';
import { formatRupees } from '../ui/planPricing';

type QuoteTotals = Pick<QuoteResponse, 'grandTotal' | 'walletCredit'>;

/**
 * Nothing left to pay by card or UPI: wallet credit and/or vouchers cover the order, and the API
 * settles it itself (checkout provider `wallet`) without opening Razorpay.
 */
export function orderFullyCovered(quote: QuoteTotals | undefined): boolean {
  return quote != null && quote.grandTotal === 0;
}

export interface PricedPayLabelInput {
  paying: boolean;
  /** False when the cart is empty (add-on-only order with nothing picked). */
  hasCart: boolean;
  /** The server quote, or undefined while it loads or after it failed. */
  quote: QuoteTotals | undefined;
  /** The quote request failed for a reason other than a rejected voucher. */
  quoteFailed: boolean;
}

/** Pay button text for a server-priced cart. Amounts come from the quote, never computed here. */
export function pricedPayLabel({
  paying,
  hasCart,
  quote,
  quoteFailed,
}: PricedPayLabelInput): string {
  const covered = orderFullyCovered(quote);
  if (paying) {
    if (!covered) return 'Opening Razorpay…';
    return quote && quote.walletCredit > 0 ? 'Paying from wallet…' : 'Placing your order…';
  }
  if (!hasCart) return 'Choose an add-on';
  if (quoteFailed) return 'Could not price your order';
  if (!quote) return 'Pricing your order…';
  if (covered) return quote.walletCredit > 0 ? 'Pay with wallet credit' : 'Confirm order';
  return `Pay ${formatRupees(quote.grandTotal)}`;
}

/** Line under the Pay button: Razorpay only when there is something left to pay. */
export function payCaption(quote: QuoteTotals | undefined): string {
  if (!orderFullyCovered(quote)) {
    return 'Secured by Razorpay. Choose your payment method in the checkout window.';
  }
  return quote && quote.walletCredit > 0
    ? 'Your wallet credit covers this order; no card or UPI payment is needed.'
    : 'Nothing to pay for this order; no card or UPI payment is needed.';
}
