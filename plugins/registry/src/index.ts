import type { VerticalPlugin, VerticalPluginLoader } from '@inventory-platform/routing';

/**
 * Register vertical plugins here. Each loader is dynamically imported so
 * unused vertical UI stays out of the main bundle.
 */
const PLUGIN_LOADERS: Record<string, VerticalPluginLoader> = {
  // cafe: () => import('@inventory-platform/plugin-cafe').then((m) => m.default),
  // medical: () => import('@inventory-platform/plugin-medical').then((m) => m.default),
};

export function registerVerticalPluginLoader(
  verticalId: string,
  loader: VerticalPluginLoader
): void {
  PLUGIN_LOADERS[verticalId] = loader;
}

export async function loadVerticalPlugin(
  verticalId: string
): Promise<VerticalPlugin | null> {
  const loader = PLUGIN_LOADERS[verticalId];
  if (!loader) {
    return null;
  }
  return loader();
}

export function getRegisteredVerticalIds(): string[] {
  return Object.keys(PLUGIN_LOADERS);
}
