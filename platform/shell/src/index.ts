export { OverviewPage } from './lib/OverviewPage';
export { ThemeProvider } from './lib/ThemeProvider';
export { ThemeToggle } from './lib/ThemeToggle';
export { DashboardLayout } from './lib/DashboardLayout';
export { Toast } from './lib/Toast';
export { ToastProvider } from './lib/ToastProvider';
export {
  getDashboardMenuGroupsWithCapabilities,
  resolveSellPath,
  isCustomerReturnEnabled,
  isVendorReturnEnabled,
} from './lib/capabilityNav';
export {
  useResolvedSellPath,
  useDashboardVerticalPlugin,
  VerticalPluginProvider,
} from '@inventory-platform/routing';
export { filterDashboardMenuGroupsByAccess, canAccessDashboardPath } from './lib/accessNav';
export {
  COMPOSED_DASHBOARD_MENU_GROUPS,
  DASHBOARD_MENU_GROUPS,
  getDashboardMenuGroupsForRole,
  getDashboardNavRowsForRole,
  type DashboardMenuGroup,
  type DashboardMenuItem,
  type DashboardNavRow,
} from '@inventory-platform/plugin-registry';
export { AuthInitializer } from './lib/AuthInitializer';
export { CommandPalette } from './lib/CommandPalette';
export { KeyboardShortcutsModal } from './lib/KeyboardShortcutsModal';
export {
  DASHBOARD_HOTKEY,
  getDashboardModLabel,
  getQuickNavFooterHints,
  isModLetter,
  isQuickNavSlash,
  isShortcutsHelp,
  isScanSellHidePurchaseKey,
  shouldSkipScanSellHidePurchaseKey,
} from './lib/dashboardHotkeys';
export {
  favoriteShortcutMatches,
  loadFavoritePageShortcuts,
  refreshFavoriteLabels,
  saveFavoritePageShortcuts,
  type FavoritePageShortcut,
} from './lib/favoritePageShortcuts';
export {
  KEYBOARD_NAV_GRID,
  KEYBOARD_NAV_SKIP,
  runFormKeyboardNavigation,
  shouldSkipGlobalMainKeyboardNav,
  shouldSkipNestedFormKeyboardNav,
} from './lib/formKeyboardNav';
export { FormKeyboardNavScope } from './lib/FormKeyboardNavScope';
export {
  DashboardRouteGuard,
  useDashboardRouteGuard,
  type DashboardRouteGuardState,
} from './guards';
export { UserMenuShopSection } from './lib/UserMenuShopSection';
export { ShopSwitcher } from './lib/ShopSwitcher';
export { ContextualHelpPanel } from './lib/ContextualHelpPanel';
export { YouTubeHelpModal } from './lib/YouTubeHelpModal';
export { useCapabilityFeatureGuard } from './lib/useCapabilityFeatureGuard';
