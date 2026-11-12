// Feature: advanced-product-search, Property: URL encode→decode is the identity (R6.8, R9.2)
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FilterGroup } from '../model/search.types';
import {
  decodeGroup,
  decodeSearchState,
  encodeGroup,
  encodeSearchState,
  hasSearchParams,
} from './searchUrl';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type SearchState } from './searchState';

// Any printable text, including the characters the format itself uses.
const value = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);
const fieldKey = fc.oneof(
  fc.constantFrom('companyName', 'location', 'stockState', 'vertical.brand', 'vertical.expiryDate'),
  fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9.]{0,15}$/),
);

const inGroup: fc.Arbitrary<FilterGroup> = fc
  .record({ field: fieldKey, values: fc.uniqueArray(value, { minLength: 1, maxLength: 5 }) })
  .map((g) => ({ ...g, op: 'in' as const }));
const matchesGroup: fc.Arbitrary<FilterGroup> = fc
  .record({ field: fieldKey, values: fc.tuple(value) })
  .map((g) => ({ ...g, op: 'matches' as const, values: [...g.values] }));
const withinGroup: fc.Arbitrary<FilterGroup> = fc
  .record({ field: fieldKey, days: fc.integer({ min: 1, max: 3650 }) })
  .map((g) => ({ field: g.field, op: 'withinDays' as const, values: [String(g.days)] }));
const existsGroup: fc.Arbitrary<FilterGroup> = fieldKey.map((field) => ({
  field,
  op: 'exists' as const,
  values: [],
}));
const betweenGroup: fc.Arbitrary<FilterGroup> = fc
  .record({
    field: fieldKey,
    from: fc.option(value, { nil: null }),
    to: fc.option(value, { nil: null }),
  })
  .filter((g) => g.from !== null || g.to !== null)
  .map((g) => ({ field: g.field, op: 'between' as const, values: [], from: g.from, to: g.to }));

const group = fc.oneof(inGroup, matchesGroup, withinGroup, existsGroup, betweenGroup);

const state: fc.Arbitrary<SearchState> = fc.record({
  // the box is trimmed before use, so leading/trailing blanks are not part of the state
  text: fc.oneof(
    fc.constant(''),
    value.map((s) => s.trim()),
  ),
  textMode: fc.constantFrom('pattern' as const, 'regex' as const),
  filters: fc.array(group, { maxLength: 6 }),
  match: fc.constantFrom('all' as const, 'any' as const),
  sort: fc.option(
    fieldKey.chain((k) => fc.constantFrom(`${k}:asc`, `${k}:desc`)),
    { nil: null },
  ),
  page: fc.integer({ min: 0, max: 499 }),
  size: fc.integer({ min: 1, max: MAX_PAGE_SIZE }),
  includeZeroStock: fc.boolean(),
});

describe('searchUrl', () => {
  it('encode then decode gives back the same state, through a real URL string', () => {
    fc.assert(
      fc.property(state, (s) => {
        const encoded = encodeSearchState(s).toString();
        const decoded = decodeSearchState(new URLSearchParams(encoded));
        expect(decoded).toEqual(normalise(s));
      }),
      { numRuns: 300 },
    );
  });

  it('one group survives its own round trip, whatever the values contain', () => {
    fc.assert(
      fc.property(group, (g) => {
        expect(decodeGroup(encodeGroup(g))).toEqual(normaliseGroup(g));
      }),
      { numRuns: 300 },
    );
  });

  it('leaves defaults out of the URL', () => {
    const params = encodeSearchState({
      text: '',
      textMode: 'pattern',
      filters: [],
      match: 'all',
      sort: null,
      page: 0,
      size: DEFAULT_PAGE_SIZE,
      includeZeroStock: false,
    });
    expect(params.toString()).toBe('');
    expect(hasSearchParams(params)).toBe(false);
  });

  it('reads the documented shape', () => {
    const s = decodeSearchState(
      new URLSearchParams(
        'q=para*mol&match=any&f=companyName:in:Cipla|GSK&f=expiryDate:withinDays:90&f=expiryDate:between:|2026-02-01&sort=expiryDate:asc&page=2&size=50&dump=1',
      ),
    );
    expect(s.text).toBe('para*mol');
    expect(s.match).toBe('any');
    expect(s.filters).toEqual([
      { field: 'companyName', op: 'in', values: ['Cipla', 'GSK'] },
      { field: 'expiryDate', op: 'withinDays', values: ['90'] },
      { field: 'expiryDate', op: 'between', values: [], from: null, to: '2026-02-01' },
    ]);
    expect(s.sort).toBe('expiryDate:asc');
    expect(s.page).toBe(2);
    expect(s.size).toBe(50);
    expect(s.includeZeroStock).toBe(true);
  });

  it('never throws on rubbish and falls back to defaults', () => {
    fc.assert(
      fc.property(fc.string(), (junk) => {
        const s = decodeSearchState(
          new URLSearchParams(
            `f=${encodeURIComponent(junk)}&page=${encodeURIComponent(junk)}&size=-3`,
          ),
        );
        expect(s.page).toBeGreaterThanOrEqual(0);
        expect(s.size).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(s.filters)).toBe(true);
      }),
    );
  });
});

/** What decode is specified to return for an encoded state (optional bounds become explicit nulls). */
function normalise(s: SearchState): SearchState {
  return { ...s, filters: s.filters.map(normaliseGroup) };
}

function normaliseGroup(g: FilterGroup): FilterGroup {
  if (g.op === 'between') {
    return { field: g.field, op: g.op, values: [], from: g.from ?? null, to: g.to ?? null };
  }
  return { field: g.field, op: g.op, values: [...g.values] };
}
