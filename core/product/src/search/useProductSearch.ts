// Feature: advanced-product-search — the Product Search page's state machine (R6.3, R6.3a, R6.8, R6.10).
//
// The page always shows a search. An empty URL is the default search — everything in the shop,
// default sort, the first page of 20 — so the first screen is products, not an empty form. Filter,
// sort, match and page changes go to the URL (and so to the server) right away — filter ticks after
// a 250 ms pause so a quick run of ticks is one request — while text edits wait for Search.
//
// The URL is the single source of truth: back/forward and shared links reproduce the view exactly.
// The first change away from the default search pushes a history entry, so Back returns to it;
// later changes replace, so refining does not pile up entries.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type {
  FacetValue,
  FilterGroup,
  MatchMode,
  SearchField,
  SearchResponse,
  TextMode,
} from '../model/search.types';
import { useInventorySearchQuery, useSearchFieldsQuery } from '../queries/search.queries';
import {
  clearFilters,
  emptySearchState,
  facetKeys,
  removeGroup,
  sameCriteria,
  setIncludeZeroStock,
  setMatch,
  setPage,
  setPageSize,
  setSort,
  setText,
  setTextMode,
  toSearchRequest,
  type SearchState,
} from './searchState';
import {
  decodeSearchState,
  encodeSearchState,
  hasSearchParams,
  stripSearchParams,
} from './searchUrl';

export const FILTER_DEBOUNCE_MS = 250;

export interface ProductSearchController {
  /** Fields whose pill is on the strip without a filter yet (filters in the URL imply a pill). */
  pinned: readonly string[];
  pin: (fieldKey: string) => void;
  unpin: (fieldKey: string) => void;
  fields: readonly SearchField[];
  fieldsLoading: boolean;
  defaultSort: string | null;
  /** What the panel and chips show; mirrors the URL. */
  state: SearchState;
  /** The search box, which may differ from `state.text` until Search is pressed. */
  textInput: string;
  setTextInput: (text: string) => void;
  textDirty: boolean;
  /** Run the search with the current text and panel state. */
  submit: () => void;
  /** Panel changes: applied after a short debounce so a run of ticks is one request. */
  applyPanel: (next: SearchState) => void;
  removeFilter: (group: FilterGroup) => void;
  clearAllFilters: () => void;
  changeMatch: (match: MatchMode) => void;
  changeSort: (sort: string | null) => void;
  changePage: (page: number) => void;
  changePageSize: (size: number) => void;
  changeIncludeZeroStock: (on: boolean) => void;
  changeTextMode: (mode: TextMode) => void;
  /** Back to the default search with everything cleared. */
  reset: () => void;
  /** The last answer (previous one while a new request loads). */
  result: SearchResponse | undefined;
  /** Counts for the panel: from the last answer that carried them. `undefined` before the first search. */
  facets: Record<string, FacetValue[]> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  retry: () => void;
}

export function useProductSearch(): ProductSearchController {
  const [searchParams, setSearchParams] = useSearchParams();
  const catalog = useSearchFieldsQuery();
  const fields = catalog.data?.fields ?? EMPTY_FIELDS;
  const defaultSort = catalog.data?.defaultSort ?? null;

  // A bare URL is the default search; otherwise the URL says exactly what to show.
  const urlHasSearch = hasSearchParams(searchParams);
  const committed = useMemo(
    () => (hasSearchParams(searchParams) ? decodeSearchState(searchParams) : emptySearchState()),
    [searchParams],
  );

  // The panel state; mirrors the URL and carries edits until they are written back.
  const [draft, setDraft] = useState<SearchState>(() => committed);
  const [textInput, setTextInput] = useState(() => committed.text);
  const lastWritten = useRef<string | null>(null);
  // Pills added through "+ Add filter" that hold no filter yet. Counts are requested for these and
  // for fields with a filter — never for the whole catalog (R10.1). Once the URL carries a filter
  // for a pinned field the pin is dropped: the filter itself keeps the pill.
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => {
    setPinned((prev) => {
      const next = prev.filter((k) => !committed.filters.some((g) => g.field === k));
      return next.length === prev.length ? prev : next;
    });
  }, [committed]);
  // A failed search keeps the previous answer on screen next to the error (R6.11). TanStack only
  // keeps the previous data while loading, not after an error, so the last good answer is held here.
  const lastGood = useRef<SearchResponse | undefined>(undefined);

  // URL changed (our write, back/forward, or a shared link): mirror it into the panel. Only an
  // outside change (not our own write) overwrites what is being typed in the search box.
  useEffect(() => {
    setDraft(committed);
    if (lastWritten.current !== searchParams.toString()) {
      setTextInput(committed.text);
    }
    lastWritten.current = null;
  }, [committed, searchParams]);

  const writeUrl = useCallback(
    (next: SearchState) => {
      const params = stripSearchParams(searchParams);
      for (const [k, v] of encodeSearchState(next)) params.append(k, v);
      // Writing the default search back leaves the URL bare, which already means that search.
      lastWritten.current = params.toString();
      // Leaving the default search is a step Back should undo; refining a search is not.
      setSearchParams(params, { replace: urlHasSearch });
    },
    [searchParams, setSearchParams, urlHasSearch],
  );

  // Debounced application of panel changes.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(
    (next: SearchState) => {
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      writeUrl(next);
    },
    [writeUrl],
  );
  const schedule = useCallback(
    (next: SearchState) => {
      if (pending.current) clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        pending.current = null;
        writeUrl(next);
      }, FILTER_DEBOUNCE_MS);
    },
    [writeUrl],
  );
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  const applyNow = useCallback(
    (next: SearchState) => {
      setDraft(next);
      flush(next);
    },
    [flush],
  );
  const applyPanel = useCallback(
    (next: SearchState) => {
      setDraft(next);
      schedule(next);
    },
    [schedule],
  );

  const submit = useCallback(() => {
    const next = setText(draft, textInput);
    setDraft(next);
    flush(next);
  }, [draft, textInput, flush]);

  const reset = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    lastGood.current = undefined;
    const params = stripSearchParams(searchParams);
    lastWritten.current = params.toString();
    setSearchParams(params);
    setDraft(emptySearchState());
    setTextInput('');
    setPinned([]);
  }, [searchParams, setSearchParams]);

  // ---- the request -----------------------------------------------------------------------------
  const keys = useMemo(() => {
    const wanted = new Set<string>(pinned);
    for (const g of committed.filters) wanted.add(g.field);
    return facetKeys(fields).filter((k) => wanted.has(k));
  }, [fields, pinned, committed]);
  // The last counts we received and the criteria they belong to.
  const facetCache = useRef<{ criteria: SearchState; facets: Record<string, FacetValue[]> } | null>(
    null,
  );

  // Decided once per URL change (not re-derived when the answer lands, or the key would change
  // again and trigger a second request): a page or size turn on the same criteria asks for no
  // facets, because the counts on screen are still right (R10.1).
  const keysSignature = keys.join('|');
  const request = useMemo(() => {
    if (!catalog.data) return null;
    const wanted = keysSignature ? keysSignature.split('|') : [];
    const cached = facetCache.current;
    const withFacets =
      !cached ||
      !sameCriteria(cached.criteria, committed) ||
      wanted.some((k) => !(k in cached.facets));
    return toSearchRequest(committed, wanted, 'product-search', withFacets);
    // keyed by the facet keys' content so a same-content array does not re-decide `withFacets`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committed, catalog.data, keysSignature]);
  const query = useInventorySearchQuery(request);

  useEffect(() => {
    if (!request || !query.data || query.isPlaceholderData) return;
    if (request.facets.length > 0) {
      facetCache.current = { criteria: committed, facets: query.data.facets };
    }
  }, [committed, request, query.data, query.isPlaceholderData]);

  const facets =
    request && request.facets.length > 0 && query.data && !query.isPlaceholderData
      ? query.data.facets
      : facetCache.current?.facets;

  if (query.data) lastGood.current = query.data;
  const result = query.data ?? lastGood.current;

  return {
    pinned,
    pin: (key) => setPinned((prev) => (prev.includes(key) ? prev : [...prev, key])),
    unpin: (key) =>
      setPinned((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev)),
    fields,
    fieldsLoading: catalog.isLoading,
    defaultSort,
    state: draft,
    textInput,
    setTextInput,
    textDirty: textInput !== committed.text,
    submit,
    applyPanel,
    removeFilter: (group) => applyNow(removeGroup(draft, group)),
    clearAllFilters: () => applyNow(clearFilters(draft)),
    changeMatch: (match) => applyNow(setMatch(draft, match)),
    changeSort: (sort) => applyNow(setSort(draft, sort)),
    changePage: (page) => applyNow(setPage(draft, page)),
    changePageSize: (size) => applyNow(setPageSize(draft, size)),
    changeIncludeZeroStock: (on) => applyNow(setIncludeZeroStock(draft, on)),
    changeTextMode: (textMode) => {
      const next = setTextMode(draft, textMode);
      setDraft(next);
      if (next.text.trim()) flush(next);
    },
    reset,
    result,
    facets,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: (query.error as Error | null) ?? (catalog.error as Error | null) ?? null,
    retry: () => {
      if (catalog.error) void catalog.refetch();
      else void query.refetch();
    },
  };
}

const EMPTY_FIELDS: readonly SearchField[] = [];
