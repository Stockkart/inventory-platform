import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cardLayoutApi } from '../api/cardLayout.api';
import type {
  CardFieldCatalogResponse,
  CardLayoutsResponse,
  SaveCardLayoutRequest,
  SurfaceLayoutResponse,
} from '../model/cardLayout.types';
import { productKeys } from './keys';

export interface CardLayoutQueryOptions {
  enabled?: boolean;
}

/**
 * Every card surface for the active shop in one request (configurable-product-card Req 7.10).
 * Search pages subscribe to this once; cards never fetch.
 */
export function useCardLayoutsQuery(options?: CardLayoutQueryOptions) {
  return useQuery<CardLayoutsResponse>({
    queryKey: productKeys.cardLayouts(),
    queryFn: cardLayoutApi.getAll,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/** Card-usable fields, surfaces and editor limits. Changes rarely; cached for 5 minutes. */
export function useCardFieldCatalogQuery(options?: CardLayoutQueryOptions) {
  return useQuery<CardFieldCatalogResponse>({
    queryKey: productKeys.cardFieldCatalog(),
    queryFn: cardLayoutApi.fieldCatalog,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/** On-demand defaults for "Reset to defaults"; never touches the layouts cache. */
export function useCardLayoutDefaultsMutation() {
  return useMutation<SurfaceLayoutResponse, Error, string>({
    mutationFn: (surfaceId) => cardLayoutApi.defaults(surfaceId),
  });
}

export interface SaveCardLayoutVariables {
  surfaceId: string;
  request: SaveCardLayoutRequest;
}

/**
 * Save one surface. On success the saved surface replaces its entry in the cached
 * `CardLayoutsResponse` so open search pages pick up the change on next render, then the
 * query is invalidated to reconcile with the server (Req 9.8).
 */
export function useSaveCardLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<SurfaceLayoutResponse, Error, SaveCardLayoutVariables>({
    mutationFn: ({ surfaceId, request }) => cardLayoutApi.save(surfaceId, request),
    onSuccess: (saved) => {
      const key = productKeys.cardLayouts();
      queryClient.setQueryData<CardLayoutsResponse>(key, (prev) => mergeSurface(prev, saved));
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Replaces (or appends) one surface in a cached layouts response. Pure; exported for tests. */
export function mergeSurface(
  prev: CardLayoutsResponse | undefined,
  saved: SurfaceLayoutResponse,
): CardLayoutsResponse {
  if (!prev) {
    return { surfaces: [saved] };
  }
  const idx = prev.surfaces.findIndex((s) => s.surfaceId === saved.surfaceId);
  if (idx < 0) {
    return { surfaces: [...prev.surfaces, saved] };
  }
  const surfaces = prev.surfaces.slice();
  surfaces[idx] = saved;
  return { surfaces };
}
