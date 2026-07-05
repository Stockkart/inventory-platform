export type {
  LazyRouteModule,
  RouteModule,
  NavContribution,
  NavContributionItem,
  VerticalPlugin,
  VerticalPluginLoader,
  VerticalPluginSellSurface,
} from './lib/types';
export {
  DEFAULT_SKU_SCAN_SELL_PATH,
  DEFAULT_MENU_LIST_SELL_PATH,
  resolveSellPath,
  type SellPathPlugin,
} from './lib/sell-surface';
export {
  VerticalPluginProvider,
  useDashboardVerticalPlugin,
  useResolvedSellPath,
} from './lib/VerticalPluginContext';
export {
  composeDashboardRouteEntries,
  flattenRouteModules,
  joinRoutePath,
  type ComposedRouteEntry,
  type RoutePackageRegistration,
} from './lib/compose-routes';
