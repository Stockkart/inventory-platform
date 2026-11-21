import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { barcodeLabelLayoutApi } from '../api/barcodeLabelLayout.api';
import type {
  FieldCatalogResponse,
  LabelLayoutResponse,
  SaveLabelLayoutRequest,
} from '../model/labelLayout.types';
import { productKeys } from './keys';

export interface LabelLayoutQueryOptions {
  enabled?: boolean;
}

/**
 * Active-shop barcode label layout (Req 5.2, 8.1).
 * `barcodeLabelLayoutApi.get` also refreshes `labelLayoutSession` for offline prints.
 */
export function useLabelLayoutQuery(options?: LabelLayoutQueryOptions) {
  return useQuery<LabelLayoutResponse>({
    queryKey: productKeys.labelLayout(),
    queryFn: barcodeLabelLayoutApi.get,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

/**
 * Field catalog for the active shop type (Req 5.2). Changes rarely; cached for 5 minutes.
 */
export function useLabelFieldCatalogQuery(options?: LabelLayoutQueryOptions) {
  return useQuery<FieldCatalogResponse>({
    queryKey: productKeys.labelFieldCatalog(),
    queryFn: barcodeLabelLayoutApi.fieldCatalog,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/**
 * Server-resolved effective layout for an unsaved draft, used by the live
 * preview so the screen never computes sticker, sheet or roll geometry itself.
 * Keyed by the request; the previous result stays on screen while a new one loads.
 */
export function useLabelLayoutPreviewQuery(
  request: SaveLabelLayoutRequest,
  options?: LabelLayoutQueryOptions,
) {
  return useQuery<LabelLayoutResponse>({
    queryKey: productKeys.labelLayoutPreview(request),
    queryFn: () => barcodeLabelLayoutApi.preview(request),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * On-demand fetch of the shop-type default layout for "Reset to defaults".
 * Does not touch the layout query cache or the session: the default is not the
 * shop's saved layout until the user explicitly saves it.
 */
export function useLabelLayoutDefaultsMutation() {
  return useMutation<LabelLayoutResponse, Error, void>({
    mutationFn: () => barcodeLabelLayoutApi.defaults(),
  });
}

/**
 * Save the active-shop layout (Req 5.7). On success the layout query cache is
 * seeded with the server response and invalidated so any mounted consumers
 * (e.g. the print modal summary) refetch.
 */
export function useSaveLabelLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<LabelLayoutResponse, Error, SaveLabelLayoutRequest>({
    mutationFn: (data) => barcodeLabelLayoutApi.save(data),
    onSuccess: (data) => {
      const key = productKeys.labelLayout();
      queryClient.setQueryData(key, data);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
