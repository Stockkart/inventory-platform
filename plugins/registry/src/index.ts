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
