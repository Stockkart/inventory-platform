/** Plan REST paths. */
export const PLAN_ENDPOINTS = {
  BASE: '/plans',
  BY_ID: (id: string) => `/plans/${id}`,
  SHOP_STATUS: '/plans/shop/status',
  SHOP_SUGGESTED: (shopId: string) => `/plans/shop/${shopId}/suggested`,
  SHOP_ASSIGN: (shopId: string) => `/plans/shop/${shopId}/assign`,
  SHOP_USAGE: '/plans/shop/usage',
  SHOP_TRANSACTIONS: '/plans/shop/transactions',
  PAYMENT_CONFIG: '/plans/payment/config',
  PAYMENT_CHECKOUT: '/plans/payment/checkout',
  PAYMENT_VERIFY: '/plans/payment/verify',
} as const;
