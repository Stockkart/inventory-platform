import type { RouteModule } from '@inventory-platform/routing';

/**
 * HR route tree for the inventory app shell.
 * Placeholder: pages and `routes/<kebab>.tsx` files arrive with tasks 16–22, and the list is
 * registered in `plugins/registry/src/composed-dashboard-routes.ts` by task 15.2.
 * Run F2 adds the employees pages, run F3 attendance and leave, run F4 payroll and advances,
 * run F5 My HR.
 */
export const hrRoutes: RouteModule = {
  path: 'hr',
  children: [
    {
      path: 'employees',
      file: 'routes/employees.tsx',
      lazy: () => import('./routes/employees'),
    },
    {
      path: 'employees/:employeeId',
      file: 'routes/employee-detail.tsx',
      lazy: () => import('./routes/employee-detail'),
    },
    {
      path: 'attendance',
      file: 'routes/attendance.tsx',
      lazy: () => import('./routes/attendance'),
    },
    {
      path: 'attendance/month',
      file: 'routes/attendance-month.tsx',
      lazy: () => import('./routes/attendance-month'),
    },
    {
      path: 'leave',
      file: 'routes/leave.tsx',
      lazy: () => import('./routes/leave'),
    },
    {
      path: 'payroll',
      file: 'routes/payroll.tsx',
      lazy: () => import('./routes/payroll'),
    },
    {
      path: 'payroll/:runId',
      file: 'routes/payroll-run.tsx',
      lazy: () => import('./routes/payroll-run'),
    },
    {
      path: 'advances',
      file: 'routes/advances.tsx',
      lazy: () => import('./routes/advances'),
    },
    // Run F5: self-service.
    {
      path: 'me',
      file: 'routes/me.tsx',
      lazy: () => import('./routes/me'),
    },
    // HR settings in the HR menu (same section as the Profile → HR tab).
    {
      path: 'settings',
      file: 'routes/settings.tsx',
      lazy: () => import('./routes/settings'),
    },
  ],
};

export const hrDashboardRoutes: RouteModule[] = [hrRoutes];
