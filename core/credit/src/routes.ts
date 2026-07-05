import type { RouteModule } from '@inventory-platform/routing';

/** Credit route tree for the inventory app shell. */
export const creditRoutes: RouteModule = {
  path: 'credit',
  children: [{ path: '', file: 'routes/index.tsx', lazy: () => import('./routes/index') }],
};
