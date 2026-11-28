import { describe, expect, it } from 'vitest';
import { isPlanDataExceptQuote, planKeys } from './keys';

describe('isPlanDataExceptQuote', () => {
  it('matches plan queries but not cart quotes', () => {
    expect(isPlanDataExceptQuote({ queryKey: planKeys.wallet() })).toBe(true);
    expect(isPlanDataExceptQuote({ queryKey: planKeys.shopStatus() })).toBe(true);
    expect(isPlanDataExceptQuote({ queryKey: planKeys.quote({ addOns: [] }) })).toBe(false);
    expect(isPlanDataExceptQuote({ queryKey: planKeys.quotes() })).toBe(false);
  });

  it('ignores other domains', () => {
    expect(isPlanDataExceptQuote({ queryKey: ['product', 'list'] })).toBe(false);
  });
});
