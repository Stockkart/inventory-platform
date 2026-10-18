import { describe, expect, it } from 'vitest';
import {
  baseLabel,
  draftFromRules,
  draftsEqual,
  moveRule,
  schemeText,
  skippedReasonText,
  toPreviewRules,
  toRules,
} from './rateRulesDraft';
import type { RateRule } from '../model/rateRules.types';

describe('rateRulesDraft', () => {
  it('roundTripsRules', () => {
    const rules: RateRule[] = [
      { name: 'A', base: 'sellingPrice', discountPercent: 2.5, scheme: null },
      { name: 'B', base: 'priceToRetail', discountPercent: null, scheme: null },
    ];
    expect(toRules(draftFromRules(rules))).toEqual(rules);
  });

  it('dropsBlankNamesFromPreview', () => {
    const draft = draftFromRules([
      { name: ' ', base: 'sellingPrice' },
      { name: 'A', base: 'sellingPrice' },
    ]);
    expect(toPreviewRules(draft).map((r) => r.name)).toEqual(['A']);
  });

  it('movesWithinBoundsOnly', () => {
    expect(moveRule([1, 2, 3], 0, 'down')).toEqual([2, 1, 3]);
    expect(moveRule([1, 2, 3], 0, 'up')).toEqual([1, 2, 3]);
    expect(moveRule([1, 2, 3], 2, 'down')).toEqual([1, 2, 3]);
  });

  it('detectsOrderChange', () => {
    const a = draftFromRules([
      { name: 'A', base: 'priceToRetail' },
      { name: 'B', base: 'priceToRetail' },
    ]);
    expect(draftsEqual(a, { rules: moveRule(a.rules, 0, 'down') })).toBe(false);
  });

  it('labelsKnownBases', () => {
    expect(baseLabel('priceToRetail')).toBe('PTR');
    expect(baseLabel('maximumRetailPrice')).toBe('MRP');
    expect(baseLabel('sellingPrice')).toBe('Selling price');
    expect(baseLabel('other')).toBe('other');
  });

  it('formatsSchemeText', () => {
    expect(schemeText({ schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 })).toBe(
      '10 + 1',
    );
    expect(schemeText({ schemeType: 'PERCENTAGE', schemePercentage: 5 })).toBe('5%');
    expect(schemeText(null)).toBe('');
  });

  it('skippedReasonTextIsWords', () => {
    expect(skippedReasonText('BELOW_COST')).toBe('below cost');
    expect(skippedReasonText('REPLACED_BY_RULE')).toBe('replaced by rule');
  });
});
