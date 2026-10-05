// Feature: advanced-product-search — TanStack Query hooks for POST /inventory/search.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory.api';
import type { SearchFieldCatalog, SearchRequest, SearchResponse } from '../model/search.types';
import { productKeys } from './keys';

export interface SearchQueryOptions {
  enabled?: boolean;
}

/** The shop's searchable fields. Changes rarely; cached for 5 minutes (R10.4). */
export function useSearchFieldsQuery(options?: SearchQueryOptions) {
  return useQuery<SearchFieldCatalog>({
    queryKey: productKeys.searchFields(),
    queryFn: inventoryApi.searchFields,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/**
 * One search. The key is the whole request, so any change is a new query; the previous answer
 * stays on screen (dimmed) while the new one loads, and TanStack's `signal` cancels a request
 * that is superseded before it answers (R6.10, R10.5).
 */
export function useInventorySearchQuery(
  request: SearchRequest | null,
  options?: SearchQueryOptions,
) {
  return useQuery<SearchResponse>({
    queryKey: productKeys.search(request),
    queryFn: ({ signal }) => inventoryApi.searchAdvanced(request as SearchRequest, signal),
    enabled: request !== null && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}

/** Distinct values for a text facet's "Find…" box; cached for 60 seconds per field + prefix. */
export function useSearchValuesQuery(
  field: string | null,
  q: string,
  options?: SearchQueryOptions,
) {
  const prefix = q.trim();
  return useQuery<string[]>({
    queryKey: productKeys.searchValues(field ?? '', prefix),
    queryFn: ({ signal }) => inventoryApi.searchValues(field as string, prefix, 20, signal),
    enabled: field !== null && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
