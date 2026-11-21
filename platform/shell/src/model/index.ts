import type { ReactNode } from 'react';
import type { PlanEntitlementsView, SellSurface } from '@inventory-platform/access';
import type { NavContribution } from '@inventory-platform/routing';

export interface DashboardVerticalPlugin {
  id: string;
  navContributions?: NavContribution[];
  sellSurfaces?: Array<{
    sellSurface: SellSurface;
    path: string;
  }>;
}

export interface DashboardLayoutProps {
  children: ReactNode;
  verticalPlugin?: DashboardVerticalPlugin | null;
  baseMenuGroups: import('@inventory-platform/routing').DashboardMenuGroup[];
  /**
   * The shop's plan entitlements, loaded by the app layer (the shell holds no server cache).
   * Undefined or null while loading or after a failed load: nothing is hidden then.
   */
  planEntitlements?: PlanEntitlementsView | null;
}

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export type Plan = {
  name: string;
  label?: string;
  description: string;
  price: string;
  priceSuffix?: string;
  highlight?: boolean;
  features: string[];
};

export type OnboardingStep =
  | 'name'
  | 'vertical'
  | 'shopType'
  | 'contactPhone'
  | 'contactEmail'
  | 'location'
  | 'businessDetails'
  | 'tagline';

export * from './types.js';
