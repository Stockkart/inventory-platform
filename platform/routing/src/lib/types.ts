import type { ComponentType } from 'react';
import type { SellSurface } from '@inventory-platform/access';
import type { NavIconName } from './nav-icon-name';

export interface LazyRouteModule {
  index?: boolean;
  path?: string;
  /** Route module file relative to the domain package `src/` root (e.g. `routes/journal.tsx`). */
  file: string;
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
  icon: NavIconName;
}

export interface NavContribution {
  groupId: string;
  label: string;
  icon: NavIconName;
  requiredCapability?: string;
  items: NavContributionItem[];
}

export interface VerticalPluginSellSurface {
  sellSurface: SellSurface;
  /** Dashboard route for this sell mode (e.g. `/dashboard/menu-sell`). */
  path: string;
  load: () => Promise<{ default: unknown }>;
}

/** Props the Sell screen hands to every plugin-contributed sell action. */
export interface SellActionSlotProps {
  /** Server-side cart the action operates on; `null` before one exists. */
  purchaseId: string | null;
  /** True while the cart is loading or saving, so actions can hold off. */
  disabled?: boolean;
}

export interface VerticalPluginSellAction {
  /** Stable key for the rendered slot (e.g. `cafe-print-kot`). */
  id: string;
  load: () => Promise<{ default: ComponentType<SellActionSlotProps> }>;
}

export interface VerticalPlugin {
  id: string;
  loadRoutes?: () => Promise<{ default: RouteModule | RouteModule[] }>;
  navContributions?: NavContribution[];
  sellSurfaces?: VerticalPluginSellSurface[];
  /** Extra actions mounted on the Sell screen for this vertical. */
  sellActions?: VerticalPluginSellAction[];
}

export type VerticalPluginLoader = () => Promise<VerticalPlugin>;
