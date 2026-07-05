import type { ShopUiCapabilities, ShopAccess } from '@inventory-platform/access';
import type { DashboardVerticalPlugin } from '@inventory-platform/shell/types';
import type { VerticalPlugin } from '@inventory-platform/routing';
import { resolveSellPath } from '@inventory-platform/routing';
import type { DashboardMenuGroup, DashboardMenuItem } from './dashboardNavConfig';
import { getDashboardMenuGroupsForRole } from './dashboardNavConfig';
import { filterDashboardMenuGroupsByAccess } from './accessNav';

const SKU_ONLY_PRODUCT_PATHS = new Set([
  '/dashboard/scan-sell',
  '/dashboard/product-search',
  '/dashboard/pricing',
]);

const CUSTOMER_RETURN_PATH = '/dashboard/refund';
const VENDOR_RETURN_PATH = '/dashboard/vendor-return';

/** Defaults to enabled when capabilities are absent (medical / legacy). */
export function isCustomerReturnEnabled(
  capabilities: ShopUiCapabilities | null | undefined
): boolean {
  return capabilities?.features?.customerReturn !== false;
}

/** Defaults to enabled when capabilities are absent (medical / legacy). */
export function isVendorReturnEnabled(
  capabilities: ShopUiCapabilities | null | undefined
): boolean {
  return capabilities?.features?.vendorReturn !== false;
}

function filterReturnsGroup(
  groups: DashboardMenuGroup[],
  capabilities: ShopUiCapabilities | null | undefined
): DashboardMenuGroup[] {
  const customerReturn = isCustomerReturnEnabled(capabilities);
  const vendorReturn = isVendorReturnEnabled(capabilities);
  if (customerReturn && vendorReturn) {
    return groups;
  }

  return groups
    .map((group) => {
      if (group.id !== 'returns') {
        return group;
      }
      const items = group.items.filter((item) => {
        if (item.path === CUSTOMER_RETURN_PATH) return customerReturn;
        if (item.path === VENDOR_RETURN_PATH) return vendorReturn;
        return true;
      });
      return { ...group, items };
    })
    .filter((group) => group.id !== 'returns' || group.items.length > 0);
}

function pluginNavItemsForCapabilities(
  plugin: VerticalPlugin | DashboardVerticalPlugin,
  capabilities: ShopUiCapabilities
): DashboardMenuItem[] {
  const enabledPaths = new Set(capabilities.navigation.map((n) => n.path));
  const apiLabels = new Map(
    capabilities.navigation.map((n) => [n.path, n.label] as const)
  );

  const items: DashboardMenuItem[] = [];
  for (const contribution of plugin.navContributions ?? []) {
    for (const item of contribution.items) {
      if (enabledPaths.has(item.path)) {
        items.push({
          path: item.path,
          label: apiLabels.get(item.path) ?? item.label,
          icon: item.icon,
        });
      }
    }
  }
  return items;
}

function capabilityNavItems(
  capabilities: ShopUiCapabilities
): DashboardMenuItem[] {
  return capabilities.navigation.map((n) => ({
    path: n.path,
    label: n.label,
    icon: '•',
  }));
}

function mergeMenuListProductNav(
  base: DashboardMenuGroup[],
  capItems: DashboardMenuItem[]
): DashboardMenuGroup[] {
  const capPaths = new Set(capItems.map((i) => i.path));

  return base.map((group) => {
    if (group.id !== 'products') {
      return group;
    }
    const kept = group.items.filter(
      (item) =>
        !SKU_ONLY_PRODUCT_PATHS.has(item.path) && !capPaths.has(item.path)
    );
    return {
      ...group,
      items: [...capItems, ...kept],
    };
  });
}

export { resolveSellPath };

export function getDashboardMenuGroupsWithCapabilities(
  role: string | undefined,
  capabilities: ShopUiCapabilities | null | undefined,
  access?: ShopAccess | null,
  plugin?: VerticalPlugin | DashboardVerticalPlugin | null
): DashboardMenuGroup[] {
  const base = getDashboardMenuGroupsForRole(role);

  let groups = base;
  if (capabilities?.sellSurface === 'MENU_LIST') {
    const capItems =
      plugin?.navContributions?.length
        ? pluginNavItemsForCapabilities(plugin, capabilities)
        : capabilityNavItems(capabilities);
    groups = mergeMenuListProductNav(base, capItems);
  }

  return filterDashboardMenuGroupsByAccess(
    filterReturnsGroup(groups, capabilities),
    access
  );
}
