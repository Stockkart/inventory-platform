// Feature: advanced-product-search — wire types for POST /inventory/search and its catalog.
import type { InventoryItem } from './types';

/** How a filter group narrows a field. Mirrors the backend `FilterOp` wire names. */
export type FilterOp = 'in' | 'matches' | 'between' | 'withinDays' | 'exists';

/** `all` = every group must match (AND); `any` = one group is enough (OR). */
export type MatchMode = 'all' | 'any';

/** `pattern` = literal text with `*` as a wildcard; `regex` = a real regular expression. */
export type TextMode = 'pattern' | 'regex';

export type SearchFieldType = 'text' | 'number' | 'date' | 'enum';

/** Where the field's value lives. `vertical` = the shop's vertical extension row. */
export type SearchSource = 'product' | 'lot' | 'vertical' | 'computed';

/** Which section of the filter panel a field belongs to. */
export type SearchFieldGroup = 'product' | 'pricing' | 'lot' | 'vertical' | 'shop';

/** One filter in the request: a field, how to match it, and the values or range. */
export interface FilterGroup {
  field: string;
  op: FilterOp;
  /** Values for `in`; one pattern for `matches`; the day count for `withinDays`. */
  values: string[];
  /** Lower bound for `between` (ISO date or number as text). */
  from?: string | null;
  /** Upper bound for `between`. */
  to?: string | null;
}

/** Screens that search, for metrics and for the backend's defaults. */
export type SearchSurface = 'product-search' | 'scan-sell' | 'ingredient-search';

export interface SearchRequest {
  text?: string | null;
  textMode?: TextMode | null;
  filters: FilterGroup[];
  match?: MatchMode | null;
  /** Field keys whose value counts the response should include. `[]` on page turns. */
  facets: string[];
  /** `fieldKey:asc|desc`; `null` for the shop's default order. */
  sort?: string | null;
  page: number;
  size: number;
  includeZeroStock?: boolean | null;
  surface?: SearchSurface | null;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface SearchPageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SearchResponse {
  data: InventoryItem[];
  page: SearchPageMeta;
  /** Field key → values with counts. Empty when no facets were requested. */
  facets: Record<string, FacetValue[]>;
  /** The sort the server actually used (`fieldKey:asc|desc`). */
  appliedSort: string | null;
}

export interface SearchEnumValue {
  value: string;
  label: string;
}

/** One field the active shop can search, filter, facet or sort on. */
export interface SearchField {
  key: string;
  label: string;
  group: SearchFieldGroup;
  source: SearchSource;
  type: SearchFieldType;
  ops: FilterOp[];
  /** True when the panel may show a checkbox list with counts for this field. */
  facet: boolean;
  sortable: boolean;
  /** Allowed values for `enum` fields, in display order. */
  values: SearchEnumValue[];
}

export interface SearchFieldCatalog {
  fields: SearchField[];
  /** `fieldKey:asc|desc` the shop sorts by when the request names none. */
  defaultSort: string | null;
  verticalSchemaLoaded: boolean;
}
