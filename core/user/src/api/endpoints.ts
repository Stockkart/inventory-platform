/** Customer REST paths. */
export const CUSTOMER_ENDPOINTS = {
  BASE: '/customers',
  SEARCH: '/customers/search',
  BY_ID: (id: string) => `/customers/${id}`,
} as const;

/** Vendor REST paths. */
export const VENDOR_ENDPOINTS = {
  BASE: '/vendors',
  SEARCH: '/vendors/search',
  BY_ID: (id: string) => `/vendors/${id}`,
} as const;

/** Shop RBAC / access paths. */
export const SHOP_ACCESS_ENDPOINTS = {
  ME_ACCESS: '/shops/me/access',
  RBAC: (shopId: string) => `/shops/${shopId}/rbac`,
  RBAC_POLICY: (shopId: string) => `/shops/${shopId}/rbac/policy`,
  RBAC_MEMBER: (shopId: string, userId: string) => `/shops/${shopId}/rbac/members/${userId}`,
  INVITATIONS: (shopId: string) => `/shops/${shopId}/invitations`,
  USERS_ALL: (shopId: string) => `/shops/${shopId}/users/all`,
} as const;

/** Invitation accept path. */
export const INVITATION_ENDPOINTS = {
  ACCEPT: (invitationId: string) => `/invitations/${invitationId}/accept`,
  MY_INVITATIONS: '/users/invitations',
} as const;

/** Shop registration and join-request paths. */
export const SHOP_ENDPOINTS = {
  REGISTER: '/shops/register',
  ACTIVE_SHOP: '/shops/active-shop',
  INVOICE_SETTINGS: '/shops/active-shop/invoice-settings',
  INVOICE_SETTINGS_PREVIEW: '/shops/active-shop/invoice-settings/preview',
  INVOICE_SERIES: '/shops/active-shop/invoice-series',
  BY_ID: (shopId: string) => `/shops/${shopId}`,
  BY_OWNER_EMAIL: '/shops/by-owner-email',
  JOIN_REQUEST: '/shops/join-request',
  JOIN_REQUESTS: '/shops/join-requests',
  PROCESS_JOIN_REQUEST: (requestId: string) => `/shops/join-requests/${requestId}/process`,
} as const;

/** User lookup paths (vendor/customer linking). */
export const USER_ENDPOINTS = {
  SEARCH: '/users/search',
} as const;
