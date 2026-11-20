import { describe, expect, it } from 'vitest';
import type { QuoteResponse } from '@inventory-platform/plan/types';
import type { PlanTransactionResponse } from '../model/types';
import {
  amountLabel,
  hasPurchaseDetail,
  lineEachLabel,
  paidLabel,
  planVoucherText,
  periodLabel,
  purchaseDateLabel,
  purchaseTitle,
  refundLabel,
  statusTagLabel,
} from './purchaseHistory';

function tx(overrides: Partial<PlanTransactionResponse> = {}): PlanTransactionResponse {
  return {
    id: 't1',
    shopId: 's1',
    planId: 'p1',
    planName: 'Starter',
    amount: 5999,
    durationMonths: 12,
    paymentMethod: 'UPI',
    createdAt: '2026-11-12T06:00:00Z',
    refundedAt: null,
    planCode: 'STARTER',
    kind: 'PLAN',
    status: 'FULFILLED',
    items: null,
    subtotal: null,
    discountTotal: null,
    walletCredit: null,
    termStartsAt: '2026-11-12T06:00:00Z',
    termEndsAt: '2027-11-12T06:00:00Z',
    termEstimated: false,
    paymentOrderId: 'o1',
    refundedToPaymentMethod: null,
    walletCreditReturned: null,
    sortAt: '2026-11-12T06:00:00Z',
    ...overrides,
  };
}

const addOnLine = (name: string, quantity: number, type = 'ADD_ON') => ({
  type,
  code: name,
  name,
  quantity,
  unitPrice: 499,
  discount: 0,
  voucherCode: null,
  walletCredit: null,
  lineTotal: 499,
});

describe('purchaseTitle', () => {
  it('names a one-year plan', () => {
    expect(purchaseTitle(tx())).toBe('Starter · 1 year');
  });
  it('uses months for other durations, singular for one', () => {
    expect(purchaseTitle(tx({ durationMonths: 6 }))).toBe('Starter · 6 months');
    expect(purchaseTitle(tx({ durationMonths: 1 }))).toBe('Starter · 1 month');
  });
  it('is just the plan name when the duration is unknown', () => {
    expect(purchaseTitle(tx({ durationMonths: null }))).toBe('Starter');
  });
  it('lists add-ons of an add-on-only order, skipping plan lines', () => {
    const t = tx({
      kind: 'ADD_ON_ONLY',
      durationMonths: null,
      items: [
        addOnLine('SMS pack', 1),
        addOnLine('Extra user', 2),
        addOnLine('Starter', 1, 'PLAN'),
      ],
    });
    expect(purchaseTitle(t)).toBe('Add-ons: SMS pack ×1, Extra user ×2');
  });
  it('is "Add-ons" when an add-on-only order kept no lines', () => {
    expect(purchaseTitle(tx({ kind: 'ADD_ON_ONLY', items: null }))).toBe('Add-ons');
  });
  it('marks an assigned plan', () => {
    expect(purchaseTitle(tx({ kind: 'ASSIGNED' }))).toBe('Starter · assigned');
  });
});

describe('periodLabel', () => {
  it('shows the granted term', () => {
    expect(periodLabel(tx())).toBe('12 Nov 26 – 12 Nov 27');
  });
  it('prefixes an estimated term with ≈', () => {
    expect(periodLabel(tx({ kind: 'ASSIGNED', termEstimated: true }))).toBe(
      '≈ 12 Nov 26 – 12 Nov 27',
    );
  });
  it('is empty without a term', () => {
    expect(periodLabel(tx({ termStartsAt: null, termEndsAt: null }))).toBe('');
  });
  it('shows only the end for an add-on order that has no start', () => {
    expect(periodLabel(tx({ kind: 'ADD_ON_ONLY', termStartsAt: null }))).toBe('Until 12 Nov 27');
  });
});

describe('refundLabel', () => {
  it('joins the payment-method and wallet parts', () => {
    expect(
      refundLabel(
        tx({ refundedToPaymentMethod: 4999, walletCreditReturned: 2000, status: 'REFUNDED' }),
      ),
    ).toBe('Refunded ₹4,999 to UPI · ₹2,000 to wallet');
  });
  it('shows only the payment-method part on a partial refund', () => {
    expect(refundLabel(tx({ refundedToPaymentMethod: 1000 }))).toBe('Refunded ₹1,000 to UPI');
  });
  it('drops the method when it is missing', () => {
    expect(refundLabel(tx({ paymentMethod: null, refundedToPaymentMethod: 1000 }))).toBe(
      'Refunded ₹1,000',
    );
  });
  it('shows only the wallet part when nothing went to the gateway', () => {
    expect(refundLabel(tx({ walletCreditReturned: 2000 }))).toBe('Refunded ₹2,000 to wallet');
  });
  it('is plain "Refunded" for a refunded order with no figures', () => {
    expect(refundLabel(tx({ status: 'REFUNDED' }))).toBe('Refunded');
  });
  it('is empty when nothing was refunded', () => {
    expect(refundLabel(tx())).toBe('');
  });
});

describe('amountLabel', () => {
  it('formats the paid amount', () => {
    expect(amountLabel(tx())).toBe('₹5,999');
  });
  it('is a dash when the amount is hidden', () => {
    expect(amountLabel(tx({ kind: 'ASSIGNED', amount: null }))).toBe('—');
  });
});

describe('statusTagLabel', () => {
  it('says processing for paid or fulfilling orders', () => {
    expect(statusTagLabel(tx({ status: 'PAID', termStartsAt: null, termEndsAt: null }))).toBe(
      'Processing',
    );
    expect(statusTagLabel(tx({ status: 'FULFILLING' }))).toBe('Processing');
  });
  it('flags a failed fulfilment', () => {
    expect(statusTagLabel(tx({ status: 'FULFILMENT_FAILED' }))).toBe('Needs attention');
  });
  it('has no tag for finished or order-less rows', () => {
    expect(statusTagLabel(tx({ status: 'FULFILLED' }))).toBeNull();
    expect(statusTagLabel(tx({ status: 'REFUNDED' }))).toBeNull();
    expect(statusTagLabel(tx({ status: null }))).toBeNull();
  });
});

describe('purchaseDateLabel', () => {
  it('formats the purchase day in India', () => {
    expect(purchaseDateLabel('2026-11-12T20:00:00Z')).toBe('13 Nov 2026');
  });
});

describe('hasPurchaseDetail / paidLabel / lineEachLabel', () => {
  it('has no detail for an assigned row with nothing to show', () => {
    expect(hasPurchaseDetail(tx({ kind: 'ASSIGNED', amount: null }))).toBe(false);
    expect(hasPurchaseDetail(tx())).toBe(true);
    expect(hasPurchaseDetail(tx({ amount: null, subtotal: 100 }))).toBe(true);
  });
  it('omits a missing method', () => {
    expect(paidLabel(tx())).toBe('Paid · UPI');
    expect(paidLabel(tx({ paymentMethod: null }))).toBe('Paid');
  });
  it('shows the unit price of a multi-quantity line', () => {
    expect(lineEachLabel({ ...addOnLine('Extra user', 2), unitPrice: 999 })).toBe('₹999 each');
    expect(lineEachLabel(addOnLine('SMS pack', 1))).toBe('');
  });
});

describe('planVoucherText', () => {
  const quote = {
    items: [
      {
        type: 'PLAN',
        code: 'STARTER',
        name: 'Starter',
        quantity: 1,
        unitPrice: 7999,
        discount: 1000,
        voucherCode: 'STARTER1K',
      },
    ],
  } as unknown as QuoteResponse;
  it('shows the discount of the matching quote line', () => {
    expect(planVoucherText('STARTER1K', 'Starter', quote)).toBe('₹1,000 off Starter');
  });
  it('falls back when no line matches or there is no quote', () => {
    expect(planVoucherText('OTHER', 'Starter', quote)).toBe('Applies to Starter');
    expect(planVoucherText('STARTER1K', 'Starter', undefined)).toBe('Applies to Starter');
  });
});
