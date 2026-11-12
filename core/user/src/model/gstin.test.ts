import { describe, expect, it } from 'vitest';
import { gstinProblem, gstinStateCode, isValidGstin, normalizeGstin } from './gstin';

describe('gstin', () => {
  it.each(['27AAPFU0939F1ZV', '29AAICP2912R1ZR', '10AFBPL7000H1Z8', '03DOXPM4071K1ZE'])(
    'accepts the real registration %s',
    (g) => {
      expect(isValidGstin(g)).toBe(true);
      expect(gstinProblem(g)).toBeNull();
    },
  );

  it('normalizes case and whitespace', () => {
    expect(normalizeGstin(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
    expect(isValidGstin(' 27aapfu0939f1zv ')).toBe(true);
    expect(gstinStateCode('27aapfu0939f1zv')).toBe('27');
  });

  it('rejects a mistyped character and says why', () => {
    expect(isValidGstin('27AAPFU0939F1ZW')).toBe(false);
    expect(gstinProblem('27AAPFU0938F1ZV')).toMatch(/check character/);
    expect(gstinProblem('27AAPFU0939F1Z')).toMatch(/15 characters/);
    expect(gstinProblem('')).toMatch(/15-character/);
    expect(gstinStateCode('27AAPFU0939F1ZW')).toBeNull();
  });

  it('rejects the placeholder from the provider docs (bad check digit)', () => {
    expect(isValidGstin('22AAAAA0000A1Z5')).toBe(false);
  });
});
