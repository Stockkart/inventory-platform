// Feature: advanced-product-search — the one place that reads or writes the search URL (R6.8).
//
//   ?q=para*mol&mode=regex&match=any
//   &f=companyName:in:Cipla|GSK&f=expiryDate:withinDays:90&f=expiryDate:between:|2026-02-01
//   &sort=expiryDate:asc&page=2&size=50&dump=1
//
// `f` repeats once per filter group as `field:op:payload`. For `in` and `matches` the payload is
// the values joined with `|`; for `between` it is `from|to` (either side may be empty); for
// `withinDays` it is the day count; for `exists` it is empty. Inside a payload the characters
// `\`, `|` and `:` are escaped with a backslash, so any value survives the round trip. Defaults
// are left out to keep links short.
import type { FilterGroup, FilterOp, MatchMode, TextMode } from '../model/search.types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type SearchState } from './searchState';

const OPS: readonly FilterOp[] = ['in', 'matches', 'between', 'withinDays', 'exists'];

export const SEARCH_URL_KEYS = {
  text: 'q',
  textMode: 'mode',
  match: 'match',
  filter: 'f',
  sort: 'sort',
  page: 'page',
  size: 'size',
  includeZeroStock: 'dump',
} as const;

export function encodeSearchState(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.text.trim()) params.set(SEARCH_URL_KEYS.text, state.text);
  if (state.textMode !== 'pattern') params.set(SEARCH_URL_KEYS.textMode, state.textMode);
  if (state.match !== 'all') params.set(SEARCH_URL_KEYS.match, state.match);
  for (const g of state.filters) {
    params.append(SEARCH_URL_KEYS.filter, encodeGroup(g));
  }
  if (state.sort) params.set(SEARCH_URL_KEYS.sort, state.sort);
  if (state.page > 0) params.set(SEARCH_URL_KEYS.page, String(state.page));
  if (state.size !== DEFAULT_PAGE_SIZE) params.set(SEARCH_URL_KEYS.size, String(state.size));
  if (state.includeZeroStock) params.set(SEARCH_URL_KEYS.includeZeroStock, '1');
  return params;
}

/** Never throws: anything unreadable falls back to the default for that part. */
export function decodeSearchState(params: URLSearchParams): SearchState {
  const mode = params.get(SEARCH_URL_KEYS.textMode);
  const match = params.get(SEARCH_URL_KEYS.match);
  const filters: FilterGroup[] = [];
  for (const raw of params.getAll(SEARCH_URL_KEYS.filter)) {
    const g = decodeGroup(raw);
    if (g) filters.push(g);
  }
  return {
    text: params.get(SEARCH_URL_KEYS.text) ?? '',
    textMode: (mode === 'regex' ? 'regex' : 'pattern') as TextMode,
    match: (match === 'any' ? 'any' : 'all') as MatchMode,
    filters,
    sort: params.get(SEARCH_URL_KEYS.sort)?.trim() || null,
    page: nonNegativeInt(params.get(SEARCH_URL_KEYS.page), 0),
    size: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, nonNegativeInt(params.get(SEARCH_URL_KEYS.size), DEFAULT_PAGE_SIZE)),
    ),
    includeZeroStock: params.get(SEARCH_URL_KEYS.includeZeroStock) === '1',
  };
}

/** True when the URL carries any search parameter at all (the page then starts in "refining"). */
export function hasSearchParams(params: URLSearchParams): boolean {
  return Object.values(SEARCH_URL_KEYS).some((k) => params.has(k));
}

/** The same URL, with every search parameter removed and everything else untouched. */
export function stripSearchParams(params: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(params);
  for (const k of Object.values(SEARCH_URL_KEYS)) out.delete(k);
  return out;
}

// ---- groups ---------------------------------------------------------------------------------

export function encodeGroup(g: FilterGroup): string {
  let payload: string;
  switch (g.op) {
    case 'between':
      payload = `${escapePart(g.from ?? '')}|${escapePart(g.to ?? '')}`;
      break;
    case 'exists':
      payload = '';
      break;
    default:
      payload = g.values.map(escapePart).join('|');
  }
  return `${escapePart(g.field)}:${g.op}:${payload}`;
}

export function decodeGroup(raw: string): FilterGroup | null {
  const parts = splitUnescaped(raw, ':', 3);
  if (parts.length < 3) return null;
  const field = unescapePart(parts[0]);
  const op = parts[1] as FilterOp;
  if (!field || !OPS.includes(op)) return null;
  const payload = parts[2];
  switch (op) {
    case 'between': {
      const [from = '', to = ''] = splitUnescaped(payload, '|', 2).map(unescapePart);
      if (!from && !to) return null;
      return { field, op, values: [], from: from || null, to: to || null };
    }
    case 'exists':
      return { field, op, values: [] };
    default: {
      const values = payload === '' ? [] : splitUnescaped(payload, '|').map(unescapePart);
      if (values.length === 0) return null;
      return { field, op, values };
    }
  }
}

function escapePart(s: string): string {
  return s.replace(/[\\|:]/g, (c) => `\\${c}`);
}

function unescapePart(s: string): string {
  return s.replace(/\\(.)/g, '$1');
}

/** Splits on `sep` ignoring backslash-escaped occurrences; `limit` caps the number of parts. */
function splitUnescaped(s: string, sep: string, limit = Infinity): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      current += c + s[i + 1];
      i++;
    } else if (c === sep && out.length < limit - 1) {
      out.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

function nonNegativeInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}
