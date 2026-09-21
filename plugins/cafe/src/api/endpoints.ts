const id = (value: string) => encodeURIComponent(value);

export const CAFE_ORDER_ENDPOINTS = {
  ORDERS: '/cafe/orders',
  ORDER: (orderId: string) => `/cafe/orders/${id(orderId)}`,
  PUNCH: (orderId: string) => `/cafe/orders/${id(orderId)}/kots`,
  KOT_DOCUMENT: (kotId: string) => `/cafe/kots/${id(kotId)}/document`,
} as const;
