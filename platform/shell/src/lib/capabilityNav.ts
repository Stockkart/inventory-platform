import type { ShopUiCapabilities, ShopAccess } from '@inventory-platform/types';
import type { DashboardMenuGroup, DashboardMenuItem } from './dashboardNavConfig';
import { getDashboardMenuGroupsForRole } from './dashboardNavConfig';
import { filterDashboardMenuGroupsByAccess } from './accessNav';

const NAV_ICONS: Record<string, string> = {
  'product-registration': '📦',
  'manual-stock': '🔍',
  'menu-admin': '💰',
  'menu-sell': '📱',
  'scan-sell': '📱',
};

const CAFE_NAV_ORDER = [
  'product-registration',
  'manual-stock',
  'menu-admin',
  'menu-sell',
];

function iconForNavId(id: string): string {
  return NAV_ICONS[id] ?? '•';
}

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

export function resolveSellPath(
  capabilities: ShopUiCapabilities | null | undefined
): string {
  if (capabilities?.sellSurface === 'MENU_LIST') {
    const sell =
      capabilities.navigation.find((n) => n.id === 'menu-sell') ??
      capabilities.navigation[0];
    return sell?.path ?? '/dashboard/menu-sell';
  }
  return '/dashboard/scan-sell';
}

export function getDashboardMenuGroupsWithCapabilities(
  role: string | undefined,
  capabilities: ShopUiCapabilities | null | undefined,
  access?: ShopAccess | null
): DashboardMenuGroup[] {
  const base = getDashboardMenuGroupsForRole(role);

  let groups = base;
  if (capabilities?.sellSurface === 'MENU_LIST') {
    const capItems: DashboardMenuItem[] = [...capabilities.navigation]
      .sort(
        (a, b) =>
          CAFE_NAV_ORDER.indexOf(a.id) - CAFE_NAV_ORDER.indexOf(b.id)
      )
      .map((n) => ({
        path: n.path,
        label: n.label,
        icon: iconForNavId(n.id),
      }));
    const capPaths = new Set(capItems.map((i) => i.path));

    groups = base.map((group) => {
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

  return filterDashboardMenuGroupsByAccess(
    filterReturnsGroup(groups, capabilities),
    access
  );
}
