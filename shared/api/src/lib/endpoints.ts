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
    EXPIRY_BUCKETS: '/reminders/expiry-buckets',
    DETAIL_BY_ID: (id: string) => `/reminders/${id}/details`,
  },

  // Events endpoints
  EVENTS: {
    STREAM: '/events/stream',
  },

  // Vertical plugin schema endpoints
  VERTICALS: {
    BASE: '/verticals',
    SCHEMA: (verticalId: string) => `/verticals/${verticalId}/schema`,
  },

  // Shop endpoints
  SHOPS: {
    REGISTER: '/shops/register',
    ACTIVE_SHOP: '/shops/active-shop',
    ME_SCHEMA: '/shops/me/schema',
    BY_ID: (shopId: string) => `/shops/${shopId}`,
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

  /** Purchase returns → stock reduction + GSTR-2 CDNR/CDNUR */
  VENDOR_PURCHASE_RETURNS: {
    BASE: '/vendor-purchase-returns',
  },

  INVENTORY_CORRECTIONS: {
    BASE: '/inventory-corrections',
    BY_ID: (id: string) => `/inventory-corrections/${id}`,
    APPROVE_LINE: (id: string, lineId: string) =>
      `/inventory-corrections/${id}/lines/${lineId}/approve`,
    REJECT_LINE: (id: string, lineId: string) =>
      `/inventory-corrections/${id}/lines/${lineId}/reject`,
  },

  // Inventory endpoints
  INVENTORY: {
    BASE: '/inventory',
    BULK: '/inventory/bulk',
    PARSE_INVOICE: '/inventory/parse-invoice',
    PARSE_STOCK_SHEET: '/inventory/parse-stock-sheet',
    SEARCH: '/inventory/search',
    EXPIRY_BUCKETS: '/inventory/expiry-buckets',
    BY_IDS: '/inventory/by-ids',
    LOTS: '/inventory/lots',
    LOW_STOCK: '/inventory/low-stock',
    PACKAGING_UNITS: '/inventory/packaging-units',
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
  },

  // Customer endpoints
  CUSTOMERS: {
    BASE: '/customers',
    SEARCH: '/customers/search',
    BY_ID: (id: string) => `/customers/${id}`,
  },

  CREDIT: {
    BASE: '/credit',
    CHARGE: '/credit/charge',
    SETTLEMENT: '/credit/settlement',
    ACCOUNTS: '/credit/accounts',
    ENTRIES: (accountId: string) => `/credit/accounts/${accountId}/entries`,
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

  // Accounting endpoints (chart of accounts, journals, ledger, reports)
  ACCOUNTING: {
    BASE: '/accounting',
    ACCOUNTS: '/accounting/accounts',
    ACCOUNT_BY_ID: (id: string) => `/accounting/accounts/${id}`,
    JOURNAL: '/accounting/journal-entries',
    JOURNAL_BY_ID: (id: string) => `/accounting/journal-entries/${id}`,
    JOURNAL_REVERSE: (id: string) => `/accounting/journal-entries/${id}/reverse`,
    LEDGER: (accountId: string) => `/accounting/ledger/${accountId}`,
    PARTIES: '/accounting/parties',
    PARTY_STATEMENT: (type: string, partyRefId: string) =>
      `/accounting/parties/${type}/${partyRefId}/statement`,
    TRIAL_BALANCE: '/accounting/reports/trial-balance',
    PROFIT_AND_LOSS: '/accounting/reports/profit-and-loss',
    BALANCE_SHEET: '/accounting/reports/balance-sheet',
    OPENING_BALANCES: '/accounting/opening-balances',
    OPENING_BALANCES_STATUS: '/accounting/opening-balances/status',
    BACKFILL: '/accounting/admin/backfill',
  },

  // Taxation endpoints (GSTR-1, GSTR-2, GSTR-3B)
  TAXATION: {
    GSTR1: '/taxation/gstr1',
    GSTR1_DOWNLOAD: '/taxation/gstr1/download',
    /** Offline utility / portal style JSON file */
    GSTR1_OFFLINE_DOWNLOAD: '/taxation/gstr1/download/offline-return',
    GSTR2: '/taxation/gstr2',
    GSTR2_DOWNLOAD: '/taxation/gstr2/download',
    GSTR3B: '/taxation/gstr3b',
    GSTR3B_DOWNLOAD: '/taxation/gstr3b/download',
  },

  // YouTube tutorial resources
  RESOURCES: {
    BASE: '/resources',
    BY_KEY: (videoKey: string) => `/resources/key/${videoKey}`,
    FOR_ROUTE: '/resources/for-route',
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
