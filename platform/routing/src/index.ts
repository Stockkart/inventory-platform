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
export {
  mergeNavContributions,
  getDashboardNavRows,
  type DashboardMenuGroup,
  type DashboardMenuItem,
  type DashboardNavRow,
} from './lib/dashboard-nav';
export {
  KEYBOARD_NAV_ATTR,
  KEYBOARD_NAV_SKIP,
  KEYBOARD_NAV_GRID,
  runFormKeyboardNavigation,
  shouldSkipGlobalMainKeyboardNav,
  shouldSkipNestedFormKeyboardNav,
  shouldSkipContainerKeyboardNav,
} from './lib/formKeyboardNav';
export { FormKeyboardNavScope } from './lib/FormKeyboardNavScope';
export {
  isCustomerReturnEnabled,
  isVendorReturnEnabled,
} from './lib/capability-guards';
export { useCapabilityFeatureGuard } from './lib/useCapabilityFeatureGuard';
export {
  isScanSellHidePurchaseKey,
  shouldSkipScanSellHidePurchaseKey,
} from './lib/scan-sell-hotkeys';
