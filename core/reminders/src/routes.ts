import type { RouteModule } from '@inventory-platform/routing';

/** Reminders route tree for the inventory app shell. */
export const remindersRoutes: RouteModule = {
  path: 'reminders',
  children: [{ path: '', file: 'routes/index.tsx', lazy: () => import('./routes/index') }],
};

/** Low-stock inventory alert route tree. */
export const inventoryAlertRoutes: RouteModule = {
  path: 'inventory-alert',
  children: [
    {
      path: '',
      file: 'routes/inventory-alert.tsx',
      lazy: () => import('./routes/inventory-alert'),
    },
  ],
};

export const remindersDashboardRoutes: RouteModule[] = [inventoryAlertRoutes, remindersRoutes];
