import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('pricing');

export const pricingKeys = {
  ...base,
  detail: (pricingId: string) => [...base.all, 'detail', pricingId] as const,
};

export const PRICING_MODULE_VERSION = '0.1.0';
