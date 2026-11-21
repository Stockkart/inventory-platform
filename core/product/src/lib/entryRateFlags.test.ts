import { describe, expect, it } from 'vitest';
import { entryRateFlags } from './entryRateFlags';

describe('entryRateFlags', () => {
  it('distributorSeesHandTypedRatesAndGeneratedRatesWhenRulesOn', () => {
    expect(entryRateFlags({ simplePricing: false, retailPricing: false, rateRules: true })).toEqual(
      {
        showCommercialTerms: true,
        showRateTiers: true,
        showGeneratedRates: true,
      },
    );
  });

  it('retailerWithRulesSeesGeneratedRatesOnlyNotTheHandTypedEditor', () => {
    expect(entryRateFlags({ simplePricing: false, retailPricing: true, rateRules: true })).toEqual({
      showCommercialTerms: true,
      showRateTiers: false,
      showGeneratedRates: true,
    });
  });

  it('retailerWithoutRulesSeesNeither', () => {
    expect(entryRateFlags({ simplePricing: false, retailPricing: true, rateRules: false })).toEqual(
      { showCommercialTerms: true, showRateTiers: false, showGeneratedRates: false },
    );
  });

  it('cafeSeesNothingEvenIfFlagged', () => {
    expect(entryRateFlags({ simplePricing: true, retailPricing: false, rateRules: true })).toEqual({
      showCommercialTerms: false,
      showRateTiers: false,
      showGeneratedRates: false,
    });
  });
});
