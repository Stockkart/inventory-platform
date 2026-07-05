import type { RouteModule } from '@inventory-platform/routing';

export type {
  NavContribution,
  NavContributionItem,
  RouteModule,
  VerticalPlugin,
  VerticalPluginLoader,
  VerticalPluginSellSurface,
} from '@inventory-platform/routing';

export {
  registerVerticalPluginLoader,
  loadVerticalPlugin,
  getRegisteredVerticalIds,
} from './plugin-loaders';

export {
  CORE_NAV_CONTRIBUTIONS,
  COMPOSED_DASHBOARD_MENU_GROUPS,
  DASHBOARD_MENU_GROUPS,
  getDashboardMenuGroupsForRole,
  getDashboardNavRowsForRole,
  mergeNavContributions,
  shellOverviewNav,
  type DashboardMenuGroup,
  type DashboardMenuItem,
  type DashboardNavRow,
} from './composed-nav.js';

export async function loadVerticalPluginRoutes(
  plugin: import('@inventory-platform/routing').VerticalPlugin
): Promise<RouteModule[]> {
  if (!plugin.loadRoutes) {
    return [];
  }
  const result = await plugin.loadRoutes();
  return Array.isArray(result.default) ? result.default : [result.default];
}

export { useVerticalPluginStore } from './useVerticalPluginStore';
export { loadSellSurfaceComponent, resolveSellPath } from './sell-surface';
