import type { SellSurface, ShopUiCapabilities } from '@inventory-platform/access';
import type { VerticalPlugin } from './types';

export const DEFAULT_SKU_SCAN_SELL_PATH = '/dashboard/scan-sell';
export const DEFAULT_MENU_LIST_SELL_PATH = '/dashboard/menu-sell';

export type SellPathPlugin = Pick<VerticalPlugin, 'sellSurfaces' | 'navContributions'>;

function sellNavPathFromPlugin(
  plugin: SellPathPlugin,
  sellSurface: SellSurface,
): string | undefined {
  const items = plugin.navContributions?.flatMap((c) => c.items) ?? [];
  if (sellSurface === 'MENU_LIST') {
    return items.find((item) => item.path.includes('menu-sell'))?.path;
  }
  return items.find((item) => item.path.includes('scan-sell'))?.path;
}

/**
 * Resolve the dashboard path for the active sell flow.
 * Priority: plugin sellSurfaces → plugin nav → API capabilities → core defaults.
 */
export function resolveSellPath(
  capabilities: ShopUiCapabilities | null | undefined,
  plugin?: SellPathPlugin | null,
): string {
  const sellSurface: SellSurface = capabilities?.sellSurface ?? 'SKU_SCAN';

  const pluginSurface = plugin?.sellSurfaces?.find((entry) => entry.sellSurface === sellSurface);
  if (pluginSurface?.path) {
    return pluginSurface.path;
  }

  if (plugin) {
    const navPath = sellNavPathFromPlugin(plugin, sellSurface);
    if (navPath) {
      return navPath;
    }
  }

  if (capabilities?.navigation?.length) {
    const preferredId = sellSurface === 'MENU_LIST' ? 'menu-sell' : 'scan-sell';
    const fromApi =
      capabilities.navigation.find((n) => n.id === preferredId) ?? capabilities.navigation[0];
    if (fromApi?.path) {
      return fromApi.path;
    }
  }

  return sellSurface === 'MENU_LIST' ? DEFAULT_MENU_LIST_SELL_PATH : DEFAULT_SKU_SCAN_SELL_PATH;
}
