/** Dashboard REST paths. */
export const DASHBOARD_ENDPOINTS = {
  BASE: '/dashboard',
} as const;

/** Tutorial resource paths. */
export const RESOURCE_ENDPOINTS = {
  BASE: '/resources',
  BY_KEY: (videoKey: string) => `/resources/key/${videoKey}`,
  FOR_ROUTE: '/resources/for-route',
} as const;

/** Server-sent event paths. */
export const EVENT_ENDPOINTS = {
  STREAM: '/events/stream',
} as const;
