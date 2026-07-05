import type { RouteModule } from '@inventory-platform/routing';

/** Analytics route tree for the inventory app shell. */
export const analyticsRoutes: RouteModule = {
  path: 'analytics',
  children: [{ path: '', file: 'routes/index.tsx', lazy: () => import('./routes/index') }],
};
