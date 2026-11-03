import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gridLayoutApi } from '../api/gridLayout.api';
import type { GridLayoutChange, GridLayoutResponse } from '../model/gridLayout.types';
import { applyGridLayoutChange } from '../lib/gridLayoutModel';
import { productKeys } from './keys';

/**
 * One grid's shop-shared column layout. A short stale time plus refetch on window focus is how a
 * change made by another member reaches this browser.
 */
export function useGridLayoutQuery(gridId: string, options?: { enabled?: boolean }) {
  return useQuery<GridLayoutResponse>({
    queryKey: productKeys.gridLayout(gridId),
    queryFn: () => gridLayoutApi.get(gridId),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * Send one column change. The cached layout changes before the request so the grid moves at once;
 * on failure it rolls back and refetches, on success the server's layout (which includes anything
 * other members saved meanwhile) replaces it.
 */
export function useChangeGridLayoutMutation(gridId: string) {
  const queryClient = useQueryClient();
  const key = productKeys.gridLayout(gridId);
  return useMutation<
    GridLayoutResponse,
    Error,
    GridLayoutChange,
    { previous?: GridLayoutResponse }
  >({
    mutationFn: (change) => gridLayoutApi.change(gridId, change),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<GridLayoutResponse>(key);
      if (previous) {
        queryClient.setQueryData(key, applyGridLayoutChange(previous, change));
      }
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
}

/** Drop the shop's saved layout and go back to the default. */
export function useResetGridLayoutMutation(gridId: string) {
  const queryClient = useQueryClient();
  return useMutation<GridLayoutResponse, Error, void>({
    mutationFn: () => gridLayoutApi.reset(gridId),
    onSuccess: (reset) => {
      queryClient.setQueryData(productKeys.gridLayout(gridId), reset);
    },
  });
}
