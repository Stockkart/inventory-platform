import { describe, expect, it } from 'vitest';
import { sameRateTerms } from './rateTerms';

describe('sameRateTerms', () => {
  it('ignores key order and null versus absent scheme fields', () => {
    expect(
      sameRateTerms(
        {
          discountPercent: 8,
          scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
        },
        {
          discountPercent: 8,
          scheme: {
            schemePercentage: null,
            schemeFree: 1,
            schemePayFor: 10,
            schemeType: 'FIXED_UNITS',
          },
        },
      ),
    ).toBe(true);
  });

  it('treats no scheme, a null scheme and an all-empty scheme alike', () => {
    expect(sameRateTerms({ discountPercent: 5 }, { discountPercent: 5, scheme: null })).toBe(true);
    expect(
      sameRateTerms(
        { discountPercent: 5, scheme: null },
        { discountPercent: 5, scheme: { schemeType: null, schemePercentage: null } },
      ),
    ).toBe(true);
    expect(sameRateTerms({ discountPercent: null }, {})).toBe(true);
    expect(sameRateTerms(undefined, { discountPercent: null, scheme: null })).toBe(true);
  });

  it('spots a changed discount or scheme field', () => {
    const saved = {
      discountPercent: 8,
      scheme: { schemeType: 'FIXED_UNITS' as const, schemePayFor: 10, schemeFree: 1 },
    };
    expect(sameRateTerms(saved, { ...saved, discountPercent: 7 })).toBe(false);
    expect(sameRateTerms(saved, { ...saved, scheme: { ...saved.scheme, schemeFree: 2 } })).toBe(
      false,
    );
    expect(
      sameRateTerms(saved, {
        ...saved,
        scheme: { schemeType: 'PERCENTAGE', schemePercentage: 10 },
      }),
    ).toBe(false);
    expect(sameRateTerms(saved, undefined)).toBe(false);
  });
});
