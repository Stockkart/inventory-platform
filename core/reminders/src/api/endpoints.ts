/** Reminder REST paths. */
export const REMINDERS_ENDPOINTS = {
  BASE: '/reminders',
  BY_ID: (id: string) => `/reminders/${id}`,
  SNOOZE: (id: string) => `/reminders/${id}/snooze`,
  DETAILS: '/reminders/details',
  EXPIRY_BUCKETS: '/reminders/expiry-buckets',
  DETAIL_BY_ID: (id: string) => `/reminders/${id}/details`,
} as const;

/** Inventory paths used by the low-stock alert page. */
export const INVENTORY_ALERT_ENDPOINTS = {
  LOW_STOCK: '/inventory/low-stock',
  BY_ID: (id: string) => `/inventory/${id}`,
} as const;
