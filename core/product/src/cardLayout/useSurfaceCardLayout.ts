import { useCallback, useMemo } from 'react';
import type { InventoryItem } from '../model/types';
import type {
  CardVariant,
  ResolvedCardLayout,
  SurfaceLayoutResponse,
} from '../model/cardLayout.types';
import { useCardLayoutsQuery } from '../queries/cardLayout.queries';
import { fallbackLayoutFor } from './cardLayoutDefaults';

export interface SurfaceCardLayout {
  /** The layout for one item, chosen by its billing mode. A map lookup; safe to call per card. */
  layoutFor(item: Pick<InventoryItem, 'billingMode'>): ResolvedCardLayout;
  /** The server's description of the surface, or `null` while loading / on error. */
  surface: SurfaceLayoutResponse | null;
  /** True while the built-in fallback is in use. */
  isFallback: boolean;
}

export function variantFor(item: Pick<InventoryItem, 'billingMode'>): CardVariant {
  return item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
}

/**
 * The only thing a page needs to render configurable cards (configurable-product-card Req 7.10,
 * 7.11, 7.12, 8.4, 10.1). Subscribes once to the shop's layouts query, memoises the
 * `{REGULAR, BASIC}` pair for one surface, and falls back to the built-in layout until the server
 * answers — swapping over without a reload when it does.
 */
export function useSurfaceCardLayout(surfaceId: string): SurfaceCardLayout {
  const { data } = useCardLayoutsQuery();
  const surface = useMemo(
    () => data?.surfaces.find((s) => s.surfaceId === surfaceId) ?? null,
    [data, surfaceId],
  );

  const pair = useMemo<Record<CardVariant, ResolvedCardLayout>>(() => {
    const regular =
      surface?.variants.REGULAR ?? fallbackLayoutFor(surfaceId, 'REGULAR');
    // A single-layout surface stores only REGULAR; BASIC items use the same layout.
    const basic = surface?.variants.BASIC ?? (surface ? regular : fallbackLayoutFor(surfaceId, 'BASIC'));
    return { REGULAR: regular, BASIC: basic };
  }, [surface, surfaceId]);

  const layoutFor = useCallback(
    (item: Pick<InventoryItem, 'billingMode'>) => pair[variantFor(item)],
    [pair],
  );

  return { layoutFor, surface, isFallback: surface == null };
}
