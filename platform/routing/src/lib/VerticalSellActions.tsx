import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import type { SellActionSlotProps } from './types';
import { useDashboardVerticalPlugin } from './VerticalPluginContext';

/**
 * Renders the sell-screen actions contributed by the active vertical plugin.
 *
 * `core/product` owns the Sell screen but is `type:core`, so it may not import
 * `plugins/*` (see the `@nx/enforce-module-boundaries` depConstraints in
 * eslint.config.mjs). A vertical that needs its own action beside the cart —
 * cafe's Print KOT — contributes a lazily loaded component through
 * `VerticalPlugin.sellActions`, and the Sell screen renders it through this slot
 * without knowing which vertical is mounted. Shops whose plugin contributes
 * nothing render nothing.
 */
export function VerticalSellActions(props: SellActionSlotProps) {
  const plugin = useDashboardVerticalPlugin();
  const actions = plugin?.sellActions;

  const entries = useMemo(
    () =>
      (actions ?? []).map((action) => ({
        id: action.id,
        Component: lazy(action.load) as unknown as ComponentType<SellActionSlotProps>,
      })),
    [actions],
  );

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(({ id, Component }) => (
        <Suspense key={id} fallback={null}>
          {/* Keyed by cart: an action is scoped to the purchase it acts on, so switching
              or opening a quotation remounts it rather than carrying that cart's state
              (cafe: the ticket strip and the live idempotency key) onto another one. */}
          <Component key={props.purchaseId ?? 'no-cart'} {...props} />
        </Suspense>
      ))}
    </>
  );
}
