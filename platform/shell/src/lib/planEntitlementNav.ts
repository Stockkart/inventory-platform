import type { PlanEntitlementsView } from '@inventory-platform/access';
import { isPlanFeatureEnabled } from '@inventory-platform/access';
import type { DashboardMenuGroup } from '@inventory-platform/routing';

/**
 * Plan feature a dashboard path needs, from the nav items' `requiresFeature`: an item gates its
 * own path and everything under it. Null when no item gates the path.
 */
export function planFeatureForPath(groups: DashboardMenuGroup[], path: string): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (!item.requiresFeature) continue;
      if (path === item.path || path.startsWith(`${item.path}/`)) {
        return item.requiresFeature;
      }
    }
  }
  return null;
}

export function isPathEntitled(
  groups: DashboardMenuGroup[],
  path: string,
  entitlements: PlanEntitlementsView | null | undefined,
): boolean {
  const feature = planFeatureForPath(groups, path);
  return feature == null || isPlanFeatureEnabled(entitlements, feature);
}

/** Drops nav items whose plan feature is off, then groups left empty. */
export function filterMenuGroupsByEntitlements(
  groups: DashboardMenuGroup[],
  entitlements: PlanEntitlementsView | null | undefined,
): DashboardMenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.requiresFeature || isPlanFeatureEnabled(entitlements, item.requiresFeature),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
