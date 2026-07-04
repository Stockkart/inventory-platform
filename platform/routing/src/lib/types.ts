import type { SellSurface } from '@inventory-platform/types';

export interface LazyRouteModule {
  index?: boolean;
  path?: string;
  lazy: () => Promise<{ default: unknown; meta?: unknown }>;
  children?: LazyRouteModule[];
}

export interface RouteModule {
  path: string;
  children?: LazyRouteModule[];
}

export interface NavContributionItem {
  path: string;
  label: string;
  icon: string;
}

export interface NavContribution {
  groupId: string;
  label: string;
  icon: string;
  requiredCapability?: string;
  items: NavContributionItem[];
}

export interface VerticalPluginSellSurface {
  sellSurface: SellSurface;
  load: () => Promise<{ default: unknown }>;
}

export interface VerticalPlugin {
  id: string;
  loadRoutes?: () => Promise<{ default: RouteModule }>;
  navContributions?: NavContribution[];
  sellSurfaces?: VerticalPluginSellSurface[];
}

export type VerticalPluginLoader = () => Promise<VerticalPlugin>;
