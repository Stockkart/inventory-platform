import { describe, expect, it } from 'vitest';
import { ApiError } from '@inventory-platform/api-client';
import type { AddOnResponse } from '@inventory-platform/plan/types';
import {
  addOnPriceLabel,
  buildAddOnOnlyRequest,
  buildQuoteRequest,
  checkoutFingerprint,
  maxQuantityFor,
  normaliseVoucherCode,
  paidFromWallet,
  quoteFailureMessage,
  readVoucherRejection,
  eligibleAddOns,
  vouchersAfterRejection,
} from './cart';

function addOn(overrides: Partial<AddOnResponse>): AddOnResponse {
  return {
    code: 'X',
    name: 'X',
    description: null,
    price: 1000,
    billingType: 'ANNUAL',
    grantType: 'FEATURE',
    grantsFeature: null,
    grantsQuantity: null,
    stackable: false,
    maxQuantity: null,
    displayOrder: null,
    ...overrides,
  };
}

describe('eligibleAddOns', () => {
  it('keeps what the API marks eligible, and the plain catalogue (no flag)', () => {
    const yes = addOn({ code: 'SAL', eligible: true });
    const no = addOn({ code: 'ACC', eligible: false, ineligibleReason: 'Already included.' });
    const plain = addOn({ code: 'SEAT', eligible: null });
    expect(eligibleAddOns([yes, no, plain]).map((a) => a.code)).toEqual(['SAL', 'SEAT']);
  });
});

describe('maxQuantityFor', () => {
  it('is 1 unless stackable, and caps uncapped stackables', () => {
    expect(maxQuantityFor(addOn({ stackable: false, maxQuantity: 5 }))).toBe(1);
    expect(maxQuantityFor(addOn({ stackable: true, maxQuantity: 5 }))).toBe(5);
    expect(maxQuantityFor(addOn({ stackable: true }))).toBe(99);
  });
});

describe('addOnPriceLabel', () => {
  it('labels annual and one-time prices', () => {
    expect(addOnPriceLabel(addOn({ price: 2999 }))).toBe('₹2,999 / year');
    expect(addOnPriceLabel(addOn({ price: 499, billingType: 'ONE_TIME' }))).toBe('₹499 one-time');
  });
});

describe('buildQuoteRequest', () => {
  it('drops zero quantities, sorts, and omits empty parts', () => {
    expect(buildQuoteRequest('GROWTH', { SAL: 0 }, [])).toEqual({
      planCode: 'GROWTH',
      durationMonths: 12,
    });
    expect(buildQuoteRequest('GROWTH', { SEAT: 2, ACC: 1, SAL: 0 }, ['B', 'A'])).toEqual({
      planCode: 'GROWTH',
      durationMonths: 12,
      addOns: [
        { code: 'ACC', quantity: 1 },
        { code: 'SEAT', quantity: 2 },
      ],
      voucherCodes: ['A', 'B'],
    });
  });

  it('asks for wallet credit only when chosen', () => {
    expect(buildQuoteRequest('GROWTH', {}, [], true)).toEqual({
      planCode: 'GROWTH',
      durationMonths: 12,
      applyWalletCredit: true,
    });
    expect(buildQuoteRequest('GROWTH', {}, [], false)).not.toHaveProperty('applyWalletCredit');
  });
});

describe('buildAddOnOnlyRequest', () => {
  it('sends add-ons with no plan code or duration', () => {
    expect(buildAddOnOnlyRequest({ SEAT: 2, OCR: 1 }, ['B', 'A'], true)).toEqual({
      addOns: [
        { code: 'OCR', quantity: 1 },
        { code: 'SEAT', quantity: 2 },
      ],
      voucherCodes: ['A', 'B'],
      applyWalletCredit: true,
    });
  });

  it('is null with nothing selected, since the server needs one add-on', () => {
    expect(buildAddOnOnlyRequest({}, [])).toBeNull();
    expect(buildAddOnOnlyRequest({ SEAT: 0 }, ['A'])).toBeNull();
  });
});

describe('paidFromWallet', () => {
  it('is true only for wallet-provider checkouts', () => {
    const checkout = {
      orderId: 'o',
      provider: 'wallet',
      amount: 0,
      currency: 'INR',
      planName: 'G',
    };
    expect(paidFromWallet(checkout)).toBe(true);
    expect(paidFromWallet({ ...checkout, provider: 'razorpay' })).toBe(false);
  });
});

describe('normaliseVoucherCode', () => {
  it('trims and upper-cases like the server', () => {
    expect(normaliseVoucherCode('  diwali-ab12 ')).toBe('DIWALI-AB12');
  });
});

describe('readVoucherRejection', () => {
  it('reads the code and reason from a VOUCHER_REJECTED error', () => {
    const error = new ApiError('Voucher X is exhausted', {
      status: 400,
      code: 'VOUCHER_REJECTED',
      details: { voucherCode: 'X', reason: 'EXHAUSTED' },
    });
    expect(readVoucherRejection(error)).toEqual({
      voucherCode: 'X',
      message: 'This voucher has been fully used.',
    });
  });

  it('ignores other errors', () => {
    expect(readVoucherRejection(new ApiError('bad', { status: 400 }))).toBeNull();
    expect(readVoucherRejection(new Error('boom'))).toBeNull();
  });
});

describe('vouchersAfterRejection', () => {
  it('drops only the voucher the API named', () => {
    expect(
      vouchersAfterRejection(['A', 'B'], {
        voucherCode: 'B',
        message: 'This voucher has expired.',
      }),
    ).toEqual(['A']);
  });

  it('clears every voucher when the API names none', () => {
    expect(vouchersAfterRejection(['A', 'B'], { voucherCode: null, message: 'No.' })).toEqual([]);
  });
});

describe('checkoutFingerprint', () => {
  const request = buildQuoteRequest('GROWTH', {}, ['SAVE10']);

  it('is the same for the same cart and totals, so a retry reuses the key', () => {
    expect(checkoutFingerprint(request, { grandTotal: 900, walletCredit: 0 })).toBe(
      checkoutFingerprint({ ...request }, { grandTotal: 900, walletCredit: 0 }),
    );
  });

  it('changes when the quoted total or wallet credit changes for the same cart', () => {
    const before = checkoutFingerprint(request, { grandTotal: 900, walletCredit: 0 });
    expect(checkoutFingerprint(request, { grandTotal: 1000, walletCredit: 0 })).not.toBe(before);
    expect(checkoutFingerprint(request, { grandTotal: 900, walletCredit: 100 })).not.toBe(before);
  });
});

describe('quoteFailureMessage', () => {
  const rejected = (voucherCode: string | null) =>
    new ApiError('rejected', {
      status: 400,
      code: 'VOUCHER_REJECTED',
      details: { voucherCode, reason: 'NOT_FOUND' },
    });

  it('is empty without an error', () => {
    expect(quoteFailureMessage(null, [])).toBeNull();
  });

  it('leaves a rejected voucher that is applied to the voucher field', () => {
    expect(quoteFailureMessage(rejected('A'), ['A', 'B'])).toBeNull();
    expect(quoteFailureMessage(rejected(null), ['A'])).toBeNull();
  });

  it('reports a rejection that leaves nothing to drop, so the cart is not stuck pricing', () => {
    expect(quoteFailureMessage(rejected('GONE'), ['A'])).toBe('This voucher code does not exist.');
    expect(quoteFailureMessage(rejected(null), [])).toBe('This voucher code does not exist.');
  });

  it('reports any other error', () => {
    expect(quoteFailureMessage(new ApiError('Server down', { status: 503 }), [])).toBe(
      'Server down',
    );
  });
});
