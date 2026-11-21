// Feature: advanced-product-search — the search state and the small, pure helpers that change it.
import type {
  FilterGroup,
  FilterOp,
  MatchMode,
  SearchField,
  SearchRequest,
  SearchSurface,
  TextMode,
} from '../model/search.types';

/** Everything the Product Search page needs to reproduce a view. Lives in the URL (R6.8). */
export interface SearchState {
  text: string;
  textMode: TextMode;
  filters: FilterGroup[];
  match: MatchMode;
  /** `fieldKey:asc|desc`, or `null` for the shop's default order. */
  sort: string | null;
  page: number;
  size: number;
  includeZeroStock: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
/** The backend refuses larger pages (R2.7). */
export const MAX_PAGE_SIZE = 200;

export const EMPTY_SEARCH_STATE: SearchState = {
  text: '',
  textMode: 'pattern',
  filters: [],
  match: 'all',
  sort: null,
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  includeZeroStock: false,
};

/** A fresh, independent copy of the empty state. */
export function emptySearchState(): SearchState {
  return { ...EMPTY_SEARCH_STATE, filters: [] };
}

/** True when the state would search for something more than "the whole shop". */
export function hasCriteria(state: SearchState): boolean {
  return state.text.trim().length > 0 || state.filters.length > 0;
}

export function findGroup(
  filters: FilterGroup[],
  field: string,
  op?: FilterOp,
): FilterGroup | undefined {
  return filters.find((g) => g.field === field && (op === undefined || g.op === op));
}

/** Add or remove one value from the field's `in` group. A group never keeps zero values. */
export function toggleValue(state: SearchState, field: string, value: string): SearchState {
  const existing = findGroup(state.filters, field, 'in');
  let filters: FilterGroup[];
  if (!existing) {
    filters = [...state.filters, { field, op: 'in', values: [value] }];
  } else if (existing.values.includes(value)) {
    const values = existing.values.filter((v) => v !== value);
    filters =
      values.length === 0
        ? state.filters.filter((g) => g !== existing)
        : state.filters.map((g) => (g === existing ? { ...g, values } : g));
  } else {
    filters = state.filters.map((g) =>
      g === existing ? { ...g, values: [...g.values, value] } : g,
    );
  }
  return { ...state, filters, page: 0 };
}

/** Replace (or remove, when both ends are empty) the field's `between` group. */
export function setRange(
  state: SearchState,
  field: string,
  from: string | null,
  to: string | null,
): SearchState {
  const withoutRange = state.filters.filter(
    (g) => !(g.field === field && (g.op === 'between' || g.op === 'withinDays')),
  );
  const f = from?.trim() || null;
  const t = to?.trim() || null;
  if (!f && !t) {
    return { ...state, filters: withoutRange, page: 0 };
  }
  return {
    ...state,
    filters: [...withoutRange, { field, op: 'between', values: [], from: f, to: t }],
    page: 0,
  };
}

/** "Within the next N days" on a date field; `null` or a non-positive number removes it. */
export function setWithinDays(state: SearchState, field: string, days: number | null): SearchState {
  const without = state.filters.filter(
    (g) => !(g.field === field && (g.op === 'between' || g.op === 'withinDays')),
  );
  if (days === null || !Number.isFinite(days) || days <= 0) {
    return { ...state, filters: without, page: 0 };
  }
  return {
    ...state,
    filters: [...without, { field, op: 'withinDays', values: [String(Math.floor(days))] }],
    page: 0,
  };
}

/** A free-text `matches` group for fields without a facet; empty text removes it. */
export function setMatches(state: SearchState, field: string, pattern: string): SearchState {
  const without = state.filters.filter((g) => !(g.field === field && g.op === 'matches'));
  const p = pattern.trim();
  if (!p) {
    return { ...state, filters: without, page: 0 };
  }
  return { ...state, filters: [...without, { field, op: 'matches', values: [p] }], page: 0 };
}

/** Toggle "has a value" on a field. */
export function setExists(state: SearchState, field: string, on: boolean): SearchState {
  const without = state.filters.filter((g) => !(g.field === field && g.op === 'exists'));
  if (!on) {
    return { ...state, filters: without, page: 0 };
  }
  return { ...state, filters: [...without, { field, op: 'exists', values: [] }], page: 0 };
}

export function removeGroup(state: SearchState, group: FilterGroup): SearchState {
  return {
    ...state,
    filters: state.filters.filter((g) => !sameGroup(g, group)),
    page: 0,
  };
}

/** Drops every filter group. The text stays (R6.5). */
export function clearFilters(state: SearchState): SearchState {
  return { ...state, filters: [], match: 'all', page: 0 };
}

export function setText(state: SearchState, text: string): SearchState {
  return { ...state, text, page: 0 };
}

export function setTextMode(state: SearchState, textMode: TextMode): SearchState {
  return { ...state, textMode, page: 0 };
}

export function setMatch(state: SearchState, match: MatchMode): SearchState {
  return { ...state, match, page: 0 };
}

export function setSort(state: SearchState, sort: string | null): SearchState {
  return { ...state, sort: sort || null, page: 0 };
}

export function setPage(state: SearchState, page: number): SearchState {
  return { ...state, page: Math.max(0, Math.floor(page)) };
}

export function setPageSize(state: SearchState, size: number): SearchState {
  const bounded = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
  return { ...state, size: bounded, page: 0 };
}

export function setIncludeZeroStock(state: SearchState, on: boolean): SearchState {
  return { ...state, includeZeroStock: on, page: 0 };
}

export function sameGroup(a: FilterGroup, b: FilterGroup): boolean {
  return (
    a.field === b.field &&
    a.op === b.op &&
    (a.from ?? null) === (b.from ?? null) &&
    (a.to ?? null) === (b.to ?? null) &&
    a.values.length === b.values.length &&
    a.values.every((v, i) => v === b.values[i])
  );
}

/** Two states ask the server for the same things (page and size included). */
export function sameState(a: SearchState, b: SearchState): boolean {
  return (
    a.text === b.text &&
    a.textMode === b.textMode &&
    a.match === b.match &&
    a.sort === b.sort &&
    a.page === b.page &&
    a.size === b.size &&
    a.includeZeroStock === b.includeZeroStock &&
    a.filters.length === b.filters.length &&
    a.filters.every((g, i) => sameGroup(g, b.filters[i]))
  );
}

/** Same criteria, possibly a different page or size — the case where facets can be skipped. */
export function sameCriteria(a: SearchState, b: SearchState): boolean {
  return sameState({ ...a, page: 0, size: 0 }, { ...b, page: 0, size: 0 });
}

/** The facet fields of a catalog, in catalog order. */
export function facetKeys(fields: readonly SearchField[]): string[] {
  return fields.filter((f) => f.facet).map((f) => f.key);
}

/**
 * The request for a state. Facets are requested only when `withFacets` is true: a page or size
 * change reuses the counts already on screen (R10.1).
 */
export function toSearchRequest(
  state: SearchState,
  facets: string[],
  surface: SearchSurface,
  withFacets = true,
): SearchRequest {
  const text = state.text.trim();
  return {
    text: text || null,
    textMode: text ? state.textMode : null,
    filters: state.filters,
    match: state.match,
    facets: withFacets ? facets : [],
    sort: state.sort,
    page: state.page,
    size: state.size,
    includeZeroStock: state.includeZeroStock,
    surface,
  };
}
