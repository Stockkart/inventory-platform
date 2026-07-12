import type { RouteModule } from '@inventory-platform/routing';

/** Taxation route tree for the inventory app shell. */
export const taxationRoutes: RouteModule = {
  path: 'taxes',
  children: [{ path: '', file: 'routes/index.tsx', lazy: () => import('./routes/index') }],
};
