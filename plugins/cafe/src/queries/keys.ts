import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('cafe-order');

export const cafeOrderKeys = {
  ...base,
  openOrders: () => [...base.all, 'open'] as const,
  order: (orderId: string) => [...base.all, 'order', orderId] as const,
};
