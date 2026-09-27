import { describe, expect, it } from 'vitest';
import { formatPercent, misPresetRange, misRangeError } from './mis';

const today = new Date(2026, 8, 27);

describe('misPresetRange', () => {
  it('covers the last 30 days including today', () => {
    expect(misPresetRange('last30', today)).toEqual({ from: '2026-08-29', to: '2026-09-27' });
  });

  it('covers calendar months', () => {
    expect(misPresetRange('thisMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-27' });
    expect(misPresetRange('lastMonth', today)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('keeps the 12-month preset within the server cap', () => {
    const range = misPresetRange('last12Months', today);
    expect(misRangeError(range)).toBeNull();
    expect(range.from).toBe('2025-09-27');
  });
});

describe('misRangeError', () => {
  it('rejects missing, backwards and overlong ranges', () => {
    expect(misRangeError({ from: '', to: '2026-09-01' })).toMatch(/both/);
    expect(misRangeError({ from: '2026-09-02', to: '2026-09-01' })).toMatch(/after/);
    expect(misRangeError({ from: '2025-01-01', to: '2026-09-01' })).toMatch(/366/);
  });

  it('accepts a single day', () => {
    expect(misRangeError({ from: '2026-09-01', to: '2026-09-01' })).toBeNull();
  });
});

describe('formatPercent', () => {
  it('shows a dash when there is nothing to divide by', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(66.67)).toBe('66.67%');
  });
});
