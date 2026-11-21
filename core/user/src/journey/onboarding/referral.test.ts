import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetReferralCode,
  initialReferralCode,
  normaliseReferralCode,
  referralCodeFromSearch,
  rememberReferralCode,
} from './referral';

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

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, String(value)),
  };
}

describe('kept referral code', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', memoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carries the code from the shared link to onboarding', () => {
    rememberReferralCode('?ref=sk-ab2cd3');
    expect(initialReferralCode('')).toBe('SK-AB2CD3');
  });

  it('prefers a code in the onboarding URL', () => {
    rememberReferralCode('?ref=sk-old111');
    expect(initialReferralCode('?ref=sk-new222')).toBe('SK-NEW222');
  });

  it('keeps the earlier code when a later page has none', () => {
    rememberReferralCode('?ref=sk-ab2cd3');
    rememberReferralCode('?utm=x');
    expect(initialReferralCode('')).toBe('SK-AB2CD3');
  });

  it('is forgotten after the shop is created', () => {
    rememberReferralCode('?ref=sk-ab2cd3');
    forgetReferralCode();
    expect(initialReferralCode('')).toBe('');
  });

  it('falls back to the URL only when storage is blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => rememberReferralCode('?ref=sk-ab2cd3')).not.toThrow();
    expect(() => forgetReferralCode()).not.toThrow();
    expect(initialReferralCode('')).toBe('');
    expect(initialReferralCode('?ref=sk-ab2cd3')).toBe('SK-AB2CD3');
  });
});
