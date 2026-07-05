import type { RouteModule } from '@inventory-platform/routing';

export const shellOverviewRoutes: RouteModule = {
  path: '',
  children: [
    {
      path: '',
      file: 'routes/overview.tsx',
      lazy: () => import('./routes/overview'),
    },
  ],
};
