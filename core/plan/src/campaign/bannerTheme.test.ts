import { describe, expect, it } from 'vitest';
import { bannerTheme } from './bannerTheme';

describe('bannerTheme', () => {
  it('uses the ui-kit look for a code that has one', () => {
    expect(bannerTheme('DIWALI')).toBe('diwali');
    expect(bannerTheme('NEW_YEAR')).toBe('newYear');
  });

  it('falls back to the default look for a code added in the database', () => {
    expect(bannerTheme('HOLI')).toBe('default');
  });

  it('falls back for a missing code and never reads object built-ins', () => {
    expect(bannerTheme(null)).toBe('default');
    expect(bannerTheme(undefined)).toBe('default');
    expect(bannerTheme('toString')).toBe('default');
  });
});
