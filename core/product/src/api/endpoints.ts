/** Inventory REST paths. */
export const INVENTORY_ENDPOINTS = {
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
} as const;

/** Vendor purchase invoice paths. */
export const VENDOR_PURCHASE_INVOICES_ENDPOINTS = {
  BASE: '/vendor-purchase-invoices',
  BY_ID: (id: string) => `/vendor-purchase-invoices/${id}`,
} as const;

/** Vendor purchase return paths. */
export const VENDOR_PURCHASE_RETURNS_ENDPOINTS = {
  BASE: '/vendor-purchase-returns',
} as const;

/** Inventory correction paths. */
export const INVENTORY_CORRECTIONS_ENDPOINTS = {
  BASE: '/inventory-corrections',
  BY_ID: (id: string) => `/inventory-corrections/${id}`,
  APPROVE_LINE: (id: string, lineId: string) =>
    `/inventory-corrections/${id}/lines/${lineId}/approve`,
  REJECT_LINE: (id: string, lineId: string) =>
    `/inventory-corrections/${id}/lines/${lineId}/reject`,
} as const;

/** Cart / quotation paths. */
export const CART_ENDPOINTS = {
  BASE: '/cart',
  ADD: '/cart/upsert',
  STATUS: '/cart/status',
  QUOTATIONS: '/cart/quotations',
  QUOTATION_BY_ID: (purchaseId: string) => `/cart/quotations/${purchaseId}`,
} as const;

/** Checkout paths. */
export const CHECKOUT_ENDPOINTS = {
  BASE: '/checkout',
} as const;

/** Shop menu & sell catalog paths. */
export const SHOP_SELL_ENDPOINTS = {
  ME_MENU: '/shops/me/menu',
  ME_SELL_CATALOG: '/shops/me/sell-catalog',
} as const;

/** Invoice PDF paths. */
export const INVOICE_ENDPOINTS = {
  PDF: (purchaseId: string, printerType?: 'NORMAL' | 'DOT_MATRIX') =>
    printerType != null
      ? `/invoices/${purchaseId}/pdf?printerType=${printerType}`
      : `/invoices/${purchaseId}/pdf`,
} as const;
