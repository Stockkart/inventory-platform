/** Pricing REST paths. */
export const PRICING_ENDPOINTS = {
  BY_ID: (pricingId: string) => `/pricing/${pricingId}`,
  BULK_UPDATE: '/pricing/bulk-update',
} as const;
