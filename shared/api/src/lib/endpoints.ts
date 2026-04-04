// API Endpoints configuration

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    ACCEPT_INVITE: '/auth/accept-invite',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Product endpoints
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    SEARCH: '/products/search',
    LOW_STOCK: '/products/low-stock',
    BY_CATEGORY: (category: string) => `/products/category/${category}`,
  },

  // Order endpoints
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    BY_STATUS: (status: string) => `/orders/status/${status}`,
  },

  // Analytics endpoints
  ANALYTICS: {
    BASE: '/analytics',
    SALES: '/analytics/sales',
    PROFIT: '/analytics/profit',
    INVENTORY: '/analytics/inventory',
    VENDORS: '/analytics/vendors',
    CUSTOMERS: '/analytics/customers',
  },

  // Alert endpoints
  ALERTS: {
    BASE: '/alerts',
    BY_ID: (id: string) => `/alerts/${id}`,
    INVENTORY: '/alerts/inventory',
  },

  // Reminder endpoints
  REMINDERS: {
    BASE: '/reminders',
    BY_ID: (id: string) => `/reminders/${id}`,
    BY_TYPE: (type: string) => `/reminders/type/${type}`,
    SNOOZE: (id: string) => `/reminders/${id}/snooze`,
    DETAILS: '/reminders/details',
    DETAIL_BY_ID: (id: string) => `/reminders/${id}/details`,
  },

  // Events endpoints
  EVENTS: {
    STREAM: '/events/stream',
  },

  // Shop endpoints
  SHOPS: {
    REGISTER: '/shops/register',
    ACTIVE_SHOP: '/shops/active-shop',
    BY_OWNER_EMAIL: '/shops/by-owner-email',
    JOIN_REQUEST: '/shops/join-request',
    JOIN_REQUESTS: '/shops/join-requests',
    PROCESS_JOIN_REQUEST: (requestId: string) =>
      `/shops/join-requests/${requestId}/process`,
    INVITATIONS: (shopId: string) => `/shops/${shopId}/invitations`,
    USERS_ALL: (shopId: string) => `/shops/${shopId}/users/all`,
  },

  // Invitation endpoints
  INVITATIONS: {
    ACCEPT: (invitationId: string) => `/invitations/${invitationId}/accept`,
  },

  // User endpoints
  USERS: {
    INVITATIONS: '/users/invitations',
    ME_SHOPS: '/users/me/shops',
    ACTIVE_SHOP: '/users/me/active-shop',
    /** Search user by email for linking to vendor/customer */
    SEARCH: '/users/search',
  },

  // Vendor purchase invoices (stock-in from vendors)
  VENDOR_PURCHASE_INVOICES: {
    BASE: '/vendor-purchase-invoices',
    BY_ID: (id: string) => `/vendor-purchase-invoices/${id}`,
  },

  // Inventory endpoints
  INVENTORY: {
    BASE: '/inventory',
    BULK: '/inventory/bulk',
    PARSE_INVOICE: '/inventory/parse-invoice',
    PARSE_STOCK_SHEET: '/inventory/parse-stock-sheet',
    SEARCH: '/inventory/search',
    LOTS: '/inventory/lots',
    LOW_STOCK: '/inventory/low-stock',
    BY_ID: (id: string) => `/inventory/${id}`,
  },

  // Checkout endpoints
  CHECKOUT: {
    BASE: '/checkout',
  },

  // Cart endpoints
  CART: {
    BASE: '/cart',
    ADD: '/cart/upsert',
    STATUS: '/cart/status',
  },

  // Purchase endpoints
  PURCHASES: {
    BASE: '/purchases',
    SEARCH: '/purchases/search',
  },

  // Refund endpoints
  REFUNDS: {
    BASE: '/refund',
  },

  // Vendor endpoints
  VENDORS: {
    BASE: '/vendors',
    SEARCH: '/vendors/search',
    BY_ID: (id: string) => `/vendors/${id}`,
    SHOPS: (vendorId: string) => `/vendors/${vendorId}/shops`,
  },

  // Customer endpoints
  CUSTOMERS: {
    BASE: '/customers',
    SEARCH: '/customers/search',
    BY_ID: (id: string) => `/customers/${id}`,
  },

  // Credit Ledger endpoints
  LEDGER: {
    BASE: '/ledger',
    BALANCE: '/ledger/balance',
    ENTRIES: '/ledger/entries',
    RECEIVABLES: '/ledger/receivables',
    CUSTOMER_RECEIVABLES: '/ledger/customer-receivables',
    PAYABLES: '/ledger/payables',
    PAYABLES_TO_SHOPS: '/ledger/payables-to-shops',
  },
  // Plan endpoints
  PLANS: {
    BASE: '/plans',
    BY_ID: (id: string) => `/plans/${id}`,
    SHOP_STATUS: '/plans/shop/status',
    SHOP_SUGGESTED: (shopId: string) => `/plans/shop/${shopId}/suggested`,
    SHOP_ASSIGN: (shopId: string) => `/plans/shop/${shopId}/assign`,
    SHOP_USAGE: '/plans/shop/usage',
    SHOP_TRANSACTIONS: '/plans/shop/transactions',
  },

  // Dashboard endpoints
  DASHBOARD: {
    BASE: '/dashboard',
  },

  // Invoice endpoints
  INVOICES: {
    PDF: (purchaseId: string, printerType?: 'NORMAL' | 'DOT_MATRIX') =>
      printerType != null
        ? `/invoices/${purchaseId}/pdf?printerType=${printerType}`
        : `/invoices/${purchaseId}/pdf`,
  },

  // Pricing endpoints
  PRICING: {
    BY_ID: (pricingId: string) => `/pricing/${pricingId}`,
    BULK_UPDATE: '/pricing/bulk-update',
  },

  // Taxation endpoints (GSTR-1, GSTR-2, GSTR-3B)
  TAXATION: {
    GSTR1: '/taxation/gstr1',
    GSTR1_DOWNLOAD: '/taxation/gstr1/download',
    GSTR2: '/taxation/gstr2',
    GSTR2_DOWNLOAD: '/taxation/gstr2/download',
    GSTR3B: '/taxation/gstr3b',
    GSTR3B_DOWNLOAD: '/taxation/gstr3b/download',
  },

  // Upload endpoints (QR Code Upload Flow)
  UPLOAD: {
    CREATE_TOKEN: '/session/create-upload-token',
    VALIDATE_TOKEN: (token: string) => `/m/upload/validate?token=${token}`,
    UPLOAD_IMAGE: (token: string) => `/m/upload?token=${token}`,
    STATUS: (token: string) => `/upload/status?token=${token}`,
    PARSED_ITEMS: (token: string) => `/upload/parsed-items?token=${token}`,
  },
} as const;
