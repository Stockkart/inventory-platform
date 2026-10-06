// Feature: advanced-product-search, Property: state helpers never leave a group with zero values (R9.2)
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SearchField } from '../model/search.types';
import {
  clearFilters,
  emptySearchState,
  removeGroup,
  sameCriteria,
  setExists,
  setMatches,
  setPage,
  setRange,
  setWithinDays,
  toSearchRequest,
  toggleValue,
  type SearchState,
} from './searchState';

const field = fc.constantFrom('companyName', 'location', 'stockState');
const value = fc.constantFrom('A', 'B', 'C', 'D');

type Step =
  | { kind: 'toggle'; field: string; value: string }
  | { kind: 'range'; field: string; from: string | null; to: string | null }
  | { kind: 'within'; field: string; days: number | null }
  | { kind: 'matches'; field: string; pattern: string }
  | { kind: 'exists'; field: string; on: boolean }
  | { kind: 'removeFirst' }
  | { kind: 'clear' };

const step: fc.Arbitrary<Step> = fc.oneof(
  fc.record({ kind: fc.constant('toggle' as const), field, value }),
  fc.record({
    kind: fc.constant('range' as const),
    field,
    from: fc.option(fc.constantFrom('1', '5', ''), { nil: null }),
    to: fc.option(fc.constantFrom('9', ''), { nil: null }),
  }),
  fc.record({
    kind: fc.constant('within' as const),
    field,
    days: fc.option(fc.integer({ min: -5, max: 90 }), { nil: null }),
  }),
  fc.record({
    kind: fc.constant('matches' as const),
    field,
    pattern: fc.constantFrom('', '  ', 'para*', 'x'),
  }),
  fc.record({ kind: fc.constant('exists' as const), field, on: fc.boolean() }),
  fc.constant({ kind: 'removeFirst' as const }),
  fc.constant({ kind: 'clear' as const }),
);

function apply(s: SearchState, st: Step): SearchState {
  switch (st.kind) {
    case 'toggle':
      return toggleValue(s, st.field, st.value);
    case 'range':
      return setRange(s, st.field, st.from, st.to);
    case 'within':
      return setWithinDays(s, st.field, st.days);
    case 'matches':
      return setMatches(s, st.field, st.pattern);
    case 'exists':
      return setExists(s, st.field, st.on);
    case 'removeFirst':
      return s.filters.length ? removeGroup(s, s.filters[0]) : s;
    case 'clear':
      return clearFilters(s);
  }
}

describe('searchState helpers', () => {
  it('after any sequence of edits every group is well formed and the page is back at 0', () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 25 }), (steps) => {
        const initial = setPage(emptySearchState(), 7);
        let s = initial;
        for (const st of steps) s = apply(s, st);
        for (const g of s.filters) {
          switch (g.op) {
            case 'in':
            case 'matches':
            case 'withinDays':
              expect(g.values.length).toBeGreaterThan(0);
              expect(g.values.every((v) => v.trim().length > 0)).toBe(true);
              break;
            case 'between':
              expect(Boolean(g.from) || Boolean(g.to)).toBe(true);
              break;
            case 'exists':
              expect(g.values).toEqual([]);
          }
        }
        // one group per (field, op) for everything except nothing — never two `in` groups on a field
        const keys = s.filters.map((g) => `${g.field}:${g.op === 'withinDays' ? 'between' : g.op}`);
        expect(new Set(keys).size).toBe(keys.length);
        if (s !== initial) expect(s.page).toBe(0);
      }),
    );
  });

  it('toggling the same value twice is a no-op', () => {
    fc.assert(
      fc.property(field, value, (f, v) => {
        const s = emptySearchState();
        expect(toggleValue(toggleValue(s, f, v), f, v).filters).toEqual([]);
      }),
    );
  });

  it('clearing filters keeps the text', () => {
    const s = { ...toggleValue(emptySearchState(), 'location', 'J1'), text: 'para' };
    expect(clearFilters(s)).toMatchObject({ text: 'para', filters: [], match: 'all' });
  });

  it('page and size changes keep the criteria, so facets can be skipped', () => {
    const s = toggleValue(emptySearchState(), 'location', 'J1');
    expect(sameCriteria(s, { ...s, page: 3, size: 50 })).toBe(true);
    expect(sameCriteria(s, toggleValue(s, 'location', 'J2'))).toBe(false);
  });

  it('builds the request with facets only when asked', () => {
    const fields: SearchField[] = [
      {
        key: 'companyName',
        label: 'Company',
        group: 'product',
        source: 'product',
        type: 'text',
        ops: ['in'],
        facet: true,
        sortable: true,
        values: [],
      },
      {
        key: 'barcode',
        label: 'Barcode',
        group: 'product',
        source: 'product',
        type: 'text',
        ops: ['matches'],
        facet: false,
        sortable: false,
        values: [],
      },
    ];
    const keys = fields.filter((f) => f.facet).map((f) => f.key);
    const s = { ...toggleValue(emptySearchState(), 'companyName', 'Cipla'), text: '  para ' };
    expect(toSearchRequest(s, keys, 'product-search')).toMatchObject({
      text: 'para',
      textMode: 'pattern',
      facets: ['companyName'],
      surface: 'product-search',
    });
    expect(toSearchRequest(s, keys, 'product-search', false).facets).toEqual([]);
    expect(toSearchRequest({ ...s, text: '' }, keys, 'product-search')).toMatchObject({
      text: null,
      textMode: null,
    });
  });
});
