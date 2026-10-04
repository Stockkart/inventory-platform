// Feature: configurable-product-card, Property 10: Formatter laws
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatCardValue, formatDate, isBlankValue } from './formatCardValue';
import { VALUE_TYPES, isoDateArb } from './testing/arbitraries';

describe('formatCardValue — Property 10: Formatter laws (Req 7.2)', () => {
  it('is deterministic', () => {
    fc.assert(
      fc.property(fc.anything(), fc.constantFrom(...VALUE_TYPES), (raw, type) => {
        expect(formatCardValue(raw, type)).toBe(formatCardValue(raw, type));
      }),
    );
  });

  it('blank input always yields the empty string', () => {
    const blanks = fc.constantFrom<unknown>(null, undefined, '', '   ', Number.NaN, []);
    fc.assert(
      fc.property(blanks, fc.constantFrom(...VALUE_TYPES), (raw, type) => {
        expect(isBlankValue(raw)).toBe(true);
        expect(formatCardValue(raw, type)).toBe('');
      }),
    );
  });

  it('currency is ₹ + exactly two decimals, no grouping', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e7, noNaN: true }), (n) => {
        expect(formatCardValue(n, 'currency')).toMatch(/^₹\d+\.\d{2}$/);
      }),
    );
    expect(formatCardValue(120, 'currency')).toBe('₹120.00');
    expect(formatCardValue('150', 'currency')).toBe('₹150.00');
  });

  it('percentage is two decimals + %', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (n) => {
        expect(formatCardValue(n, 'percentage')).toMatch(/^\d+\.\d{2}%$/);
      }),
    );
    expect(formatCardValue(5, 'percentage')).toBe('5.00%');
  });

  it('number has no trailing zeros', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (n) => {
        const out = formatCardValue(n, 'number');
        expect(out).toMatch(/^\d+(\.\d*[1-9])?$/);
      }),
    );
    expect(formatCardValue(9.2, 'number')).toBe('9.2');
    expect(formatCardValue(10, 'number')).toBe('10');
    expect(formatCardValue(10.0, 'number')).toBe('10');
  });

  it('date is d MMM yyyy', () => {
    fc.assert(
      fc.property(isoDateArb(), (iso) => {
        expect(formatCardValue(iso, 'date')).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      }),
    );
    expect(formatDate(new Date(2028, 0, 8))).toBe('8 Jan 2028');
    expect(formatDate(new Date(2026, 8, 29))).toBe('29 Sep 2026');
  });

  it('text is trimmed and never reformatted', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        fc.pre(s.trim().length > 0);
        expect(formatCardValue(s, 'text')).toBe(s.trim());
      }),
    );
  });

  it('unparseable numeric input falls back to the trimmed text', () => {
    expect(formatCardValue('n/a', 'currency')).toBe('n/a');
    expect(formatCardValue('not-a-date', 'date')).toBe('not-a-date');
  });
});
