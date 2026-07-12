import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ShopUiCapabilities } from '@inventory-platform/access';
import type { VerticalPlugin } from './types';
import { resolveSellPath } from './sell-surface';

const VerticalPluginContext = createContext<VerticalPlugin | null>(null);

export function VerticalPluginProvider({
  plugin,
  children,
}: {
  plugin: VerticalPlugin | null | undefined;
  children: ReactNode;
}) {
  return (
    <VerticalPluginContext.Provider value={plugin ?? null}>
      {children}
    </VerticalPluginContext.Provider>
  );
}

export function useDashboardVerticalPlugin(): VerticalPlugin | null {
  return useContext(VerticalPluginContext);
}

/** Active shop sell path: plugin sellSurfaces first, then capabilities, then core default. */
export function useResolvedSellPath(capabilities: ShopUiCapabilities | null | undefined): string {
  const plugin = useDashboardVerticalPlugin();
  return useMemo(() => resolveSellPath(capabilities, plugin), [capabilities, plugin]);
}
