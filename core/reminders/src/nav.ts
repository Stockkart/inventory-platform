import type { NavContribution } from '@inventory-platform/routing';

/** Sidebar nav items owned by the reminders domain. */
export const remindersNav: NavContribution = {
  groupId: 'reminders-alerts',
  label: 'Reminders & Alerts',
  icon: 'calendar',
  items: [
    { path: '/dashboard/reminders', label: 'Reminder', icon: 'calendar' },
    {
      path: '/dashboard/inventory-alert',
      label: 'Inventory Alert',
      icon: 'triangle-alert',
    },
  ],
};
