import { describe, expect, it } from 'vitest';
import { formatPlanDate } from './planDate';

describe('formatPlanDate', () => {
  it('shows the Indian calendar day as "21 Nov 2027"', () => {
    expect(formatPlanDate('2027-11-20T18:30:00Z')).toBe('21 Nov 2027');
    expect(formatPlanDate('2027-11-20T18:29:59Z')).toBe('20 Nov 2027');
  });

  it('gives null for a missing or unreadable date', () => {
    expect(formatPlanDate(null)).toBeNull();
    expect(formatPlanDate(undefined)).toBeNull();
    expect(formatPlanDate('')).toBeNull();
    expect(formatPlanDate('not a date')).toBeNull();
  });
});
