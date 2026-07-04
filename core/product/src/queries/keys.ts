import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('product');

export const productKeys = {
  ...base,
  inventoryList: (page: number, size: number) =>
    [...base.all, 'inventory-list', page, size] as const,
  inventoryDetail: (id: string) => [...base.all, 'inventory', id] as const,
  pricingDetail: (pricingId: string) =>
    [...base.all, 'pricing', pricingId] as const,
};

export const PRODUCT_MODULE_VERSION = '0.1.0';
