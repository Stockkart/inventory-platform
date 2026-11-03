import { describe, expect, it } from 'vitest';
import { ratePreviewRequest } from './ratePreviewRequest';

describe('ratePreviewRequest', () => {
  const row = { costPrice: '60', priceToRetail: 100, sgst: ' 2.5 ' };

  it('carries costPriceIncludesTax true for an INCLUSIVE bill', () => {
    expect(ratePreviewRequest(row, true).costPriceIncludesTax).toBe(true);
  });

  it('carries costPriceIncludesTax false otherwise', () => {
    expect(ratePreviewRequest(row, false).costPriceIncludesTax).toBe(false);
  });

  it('reads typed numbers and trims GST', () => {
    const r = ratePreviewRequest(row, false);
    expect(r.costPrice).toBe(60);
    expect(r.priceToRetail).toBe(100);
    expect(r.maximumRetailPrice).toBeNull();
    expect(r.sgst).toBe('2.5');
  });
});
