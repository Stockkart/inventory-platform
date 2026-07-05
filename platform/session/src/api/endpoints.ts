/** Auth REST paths. */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  ACCEPT_INVITE: '/auth/accept-invite',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

/** Vertical schema paths. */
export const VERTICAL_ENDPOINTS = {
  BASE: '/verticals',
  SCHEMA: (verticalId: string) => `/verticals/${verticalId}/schema`,
} as const;

/** Shop paths used by session (schema, capabilities, active shop). */
export const SESSION_SHOP_ENDPOINTS = {
  ME_SCHEMA: '/shops/me/schema',
  ME_CAPABILITIES: '/shops/me/capabilities',
} as const;

/** User shop membership paths (session-owned). */
export const SESSION_USER_ENDPOINTS = {
  ME_SHOPS: '/users/me/shops',
  ACTIVE_SHOP: '/users/me/active-shop',
} as const;
