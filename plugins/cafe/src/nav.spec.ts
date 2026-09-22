import { describe, expect, it } from 'vitest';
import { cafeNav } from './nav';
import { cafeRoutes } from './routes';

/**
 * A cafe screen is reachable only when both layers name its path: the backend's
 * `CafeUiContributor` enables it, and `cafeNav` below supplies the sidebar item.
 * `capabilityNav.pluginNavItemsForCapabilities` intersects the two, so an entry in one layer
 * and not the other silently yields no link at all.
 *
 * This has now shipped broken twice — the retired Orders screen, and the retired KOT screen —
 * each time with green tests, because nothing asserted the pairing. It is the invariant, not
 * any one screen, that is pinned here: it must hold whatever the cafe vertical routes next.
 */
describe('cafe navigation', () => {
  const navPaths = new Set(cafeNav.items.map((item) => item.path));

  it('offers a sidebar entry for every routed cafe screen', () => {
    const missing = cafeRoutes
      .map((route) => `/dashboard/${route.path}`)
      .filter((path) => !navPaths.has(path));

    expect(
      missing,
      `routed but unreachable — no nav item, so no sidebar link: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('routes every screen it offers in the sidebar', () => {
    const routedPaths = new Set(cafeRoutes.map((route) => `/dashboard/${route.path}`));
    // product-entry and manual-stock are core screens the cafe vertical relabels; they are
    // routed by core/product, not here, so they are expected to have no cafe route.
    const coreOwned = new Set(['/dashboard/product-entry', '/dashboard/manual-stock']);

    const dangling = [...navPaths].filter((path) => !routedPaths.has(path) && !coreOwned.has(path));

    expect(dangling, `sidebar links that route nowhere: ${dangling.join(', ')}`).toEqual([]);
  });
});
