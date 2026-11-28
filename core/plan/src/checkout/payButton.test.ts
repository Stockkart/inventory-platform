import { describe, expect, it } from 'vitest';
import { orderFullyCovered, payCaption, pricedPayLabel } from './payButton';

const due = { grandTotal: 4999, walletCredit: 0 };
const walletPaid = { grandTotal: 0, walletCredit: 4999 };
const voucherPaid = { grandTotal: 0, walletCredit: 0 };
const idle = { paying: false, hasCart: true, quoteFailed: false };

describe('orderFullyCovered', () => {
  it('is true for any ₹0 order, with or without wallet credit', () => {
    expect(orderFullyCovered(walletPaid)).toBe(true);
    expect(orderFullyCovered(voucherPaid)).toBe(true);
    expect(orderFullyCovered(due)).toBe(false);
    expect(orderFullyCovered(undefined)).toBe(false);
  });
});

describe('pricedPayLabel', () => {
  it('shows the quoted total', () => {
    expect(pricedPayLabel({ ...idle, quote: due })).toBe('Pay ₹4,999.00');
  });

  it('asks for an add-on when the cart is empty', () => {
    expect(pricedPayLabel({ ...idle, hasCart: false, quote: undefined })).toBe('Choose an add-on');
  });

  it('says pricing failed instead of spinning forever', () => {
    expect(pricedPayLabel({ ...idle, quote: undefined, quoteFailed: true })).toBe(
      'Could not price your order',
    );
    expect(pricedPayLabel({ ...idle, quote: undefined })).toBe('Pricing your order…');
  });

  it('never says "Pay ₹0"', () => {
    expect(pricedPayLabel({ ...idle, quote: walletPaid })).toBe('Pay with wallet credit');
    expect(pricedPayLabel({ ...idle, quote: voucherPaid })).toBe('Confirm order');
  });

  it('names the gateway only when one opens', () => {
    const paying = { ...idle, paying: true };
    expect(pricedPayLabel({ ...paying, quote: due })).toBe('Opening Razorpay…');
    expect(pricedPayLabel({ ...paying, quote: walletPaid })).toBe('Paying from wallet…');
    expect(pricedPayLabel({ ...paying, quote: voucherPaid })).toBe('Placing your order…');
    expect(pricedPayLabel({ ...paying, quote: undefined })).toBe('Opening Razorpay…');
  });
});

describe('payCaption', () => {
  it('mentions Razorpay only when there is something to pay', () => {
    expect(payCaption(due)).toContain('Razorpay');
    expect(payCaption(undefined)).toContain('Razorpay');
    expect(payCaption(walletPaid)).toContain('wallet credit covers');
    expect(payCaption(voucherPaid)).not.toContain('Razorpay');
  });
});
