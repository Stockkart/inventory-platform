import type { ShopUiCapabilities, ShopAccess } from '@inventory-platform/access';
import type { VerticalPlugin, DashboardMenuGroup, DashboardMenuItem } from '@inventory-platform/routing';
import { resolveSellPath } from '@inventory-platform/routing';
import {
  isCustomerReturnEnabled,
  isVendorReturnEnabled,
} from '@inventory-platform/routing';
import { filterDashboardMenuGroupsByAccess } from './accessNav';

export { isCustomerReturnEnabled, isVendorReturnEnabled };

const SKU_ONLY_PRODUCT_PATHS = new Set([
  '/dashboard/scan-sell',
  '/dashboard/product-search',
  '/dashboard/pricing',
]);

const CUSTOMER_RETURN_PATH = '/dashboard/refund';
const VENDOR_RETURN_PATH = '/dashboard/vendor-return';

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

type NavCapablePlugin = Pick<VerticalPlugin, 'navContributions'>;

function pluginNavItemsForCapabilities(
  plugin: NavCapablePlugin,
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
  baseMenuGroups: DashboardMenuGroup[],
  role: string | undefined,
  capabilities: ShopUiCapabilities | null | undefined,
  access?: ShopAccess | null,
  plugin?: NavCapablePlugin | null
): DashboardMenuGroup[] {
  void role;
  let groups = baseMenuGroups;
  if (capabilities?.sellSurface === 'MENU_LIST') {
    const capItems =
      plugin?.navContributions?.length
        ? pluginNavItemsForCapabilities(plugin, capabilities)
        : capabilityNavItems(capabilities);
    groups = mergeMenuListProductNav(baseMenuGroups, capItems);
  }

  return filterDashboardMenuGroupsByAccess(
    filterReturnsGroup(groups, capabilities),
    access
  );
}
