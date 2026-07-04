import type { VerticalPlugin } from '@inventory-platform/routing';
import { resolveSellPath } from '@inventory-platform/routing';

export async function loadSellSurfaceComponent(
  plugin: VerticalPlugin | null | undefined,
  sellSurface: 'SKU_SCAN' | 'MENU_LIST'
): Promise<unknown> {
  const entry = plugin?.sellSurfaces?.find(
    (surface) => surface.sellSurface === sellSurface
  );
  if (!entry) {
    return null;
  }
  const mod = await entry.load();
  return mod.default;
}

export { resolveSellPath };
