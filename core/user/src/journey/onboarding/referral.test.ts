import { describe, expect, it } from 'vitest';
import { normaliseReferralCode, referralCodeFromSearch } from './referral';

describe('normaliseReferralCode', () => {
  it('trims and upper-cases', () => {
    expect(normaliseReferralCode('  sk-ab2cd3 ')).toBe('SK-AB2CD3');
  });
});

describe('referralCodeFromSearch', () => {
  it('reads the ref parameter', () => {
    expect(referralCodeFromSearch('?utm=x&ref=sk-ab2cd3')).toBe('SK-AB2CD3');
  });

  it('is empty without one', () => {
    expect(referralCodeFromSearch('')).toBe('');
    expect(referralCodeFromSearch('?ref=')).toBe('');
  });
});
