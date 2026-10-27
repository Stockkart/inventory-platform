import { describe, expect, it } from 'vitest';
import type { CartResponse, CheckoutItemResponse } from '../model/types';
import { buildCartLineTaxIndex, formatGstRate } from './cartLineTax';

function item(inventoryId: string | null): CheckoutItemResponse {
  return { inventoryId } as unknown as CheckoutItemResponse;
}

function cart(partial: Partial<CartResponse>): CartResponse {
  return partial as CartResponse;
}

describe('buildCartLineTaxIndex', () => {
  it('pairs each line with the server figure at the same position', () => {
    const index = buildCartLineTaxIndex(
      cart({
        items: [item('inv-a'), item('inv-b')],
        taxSummary: {
          subTotal: 0,
          additionalDiscount: 0,
          taxableValue: 0,
          rates: [],
          cgstTotal: 0,
          sgstTotal: 0,
          roundOff: 0,
          lineRates: [],
          lines: [
            { taxableValue: 107.42, taxAmount: 5.37, ratePercent: 5 },
            { taxableValue: 66.51, taxAmount: 11.97, ratePercent: 18 },
          ],
        },
      }),
    );
    expect(index.get('inv-a')).toEqual({ taxableValue: 107.42, taxAmount: 5.37, ratePercent: 5 });
    expect(index.get('inv-b')).toEqual({ taxableValue: 66.51, taxAmount: 11.97, ratePercent: 18 });
  });

  it('is empty when the bill carries no tax summary or the API has no per-line figures', () => {
    expect(buildCartLineTaxIndex(null).size).toBe(0);
    expect(buildCartLineTaxIndex(cart({ items: [item('inv-a')], taxSummary: null })).size).toBe(0);
    expect(
      buildCartLineTaxIndex(
        cart({
          items: [item('inv-a')],
          taxSummary: {
            subTotal: 0,
            additionalDiscount: 0,
            taxableValue: 0,
            rates: [],
            cgstTotal: 0,
            sgstTotal: 0,
            roundOff: 0,
            lineRates: [],
          },
        }),
      ).size,
    ).toBe(0);
  });

  it('skips lines without an inventory id and never reads past the figures it has', () => {
    const index = buildCartLineTaxIndex(
      cart({
        items: [item(null), item('inv-b'), item('inv-c')],
        taxSummary: {
          subTotal: 0,
          additionalDiscount: 0,
          taxableValue: 0,
          rates: [],
          cgstTotal: 0,
          sgstTotal: 0,
          roundOff: 0,
          lineRates: [],
          lines: [
            { taxableValue: 1, taxAmount: 0, ratePercent: 0 },
            { taxableValue: 2, taxAmount: 0.1, ratePercent: 5 },
          ],
        },
      }),
    );
    expect([...index.keys()]).toEqual(['inv-b']);
  });
});

describe('formatGstRate', () => {
  it('drops trailing zeros but keeps real fractions', () => {
    expect(formatGstRate(5)).toBe('5');
    expect(formatGstRate(12.5)).toBe('12.5');
    expect(formatGstRate(0.25)).toBe('0.25');
    expect(formatGstRate(18.0)).toBe('18');
  });
});
