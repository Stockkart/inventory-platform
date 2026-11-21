import type { NavContribution } from '@inventory-platform/routing';

/**
 * Sidebar nav items owned by the HR domain.
 * Not wired into `plugins/registry/src/composed-nav.ts` yet (task 15.2 adds it after `team`
 * and adds per-item access gating in `platform/shell/src/lib/accessNav.ts`).
 * Wired since run F2. Only items whose pages exist are listed, so the sidebar never links to a
 * missing route; `accessNav.ts` already gates every HR path from the design table.
 */
export const hrNav: NavContribution = {
  groupId: 'hr',
  label: 'HR',
  icon: 'users',
  items: [
    { path: '/dashboard/hr/employees', label: 'Employees', icon: 'contact' },
    { path: '/dashboard/hr/attendance', label: 'Attendance', icon: 'calendar' },
    { path: '/dashboard/hr/leave', label: 'Leave', icon: 'inbox' },
    // Run F4: payroll and advances pages exist now.
    { path: '/dashboard/hr/payroll', label: 'Payroll', icon: 'circle-dollar-sign' },
    { path: '/dashboard/hr/advances', label: 'Advances', icon: 'credit-card' },
    // Run F5: My HR; `accessNav.ts` shows it only when `hr.employeeId` is set.
    { path: '/dashboard/hr/me', label: 'My HR', icon: 'user' },
    // HR settings (same section as the Profile → HR tab); read-only without MANAGE_SETTINGS.
    { path: '/dashboard/hr/settings', label: 'Settings', icon: 'settings' },
  ],
};
