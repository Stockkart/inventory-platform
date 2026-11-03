/** Analytics REST paths (mirrors backend `/analytics/*`). */
export const ANALYTICS_ENDPOINTS = {
  BASE: '/analytics',
  SALES: '/analytics/sales',
  PROFIT: '/analytics/profit',
  INVENTORY: '/analytics/inventory',
  /** One page of one Inventory-tab list ("Show more"). */
  INVENTORY_ITEMS: '/analytics/inventory/items',
  VENDORS: '/analytics/vendors',
  CUSTOMERS: '/analytics/customers',
  /** Inventory expiry index; lives under inventory API, used by inventory analytics tab. */
  EXPIRY_BUCKETS: '/inventory/expiry-buckets',
} as const;
