import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('plan');

export const planKeys = {
  ...base,
  list: () => [...base.all, 'list'] as const,
  detail: (planId: string) => [...base.all, 'detail', planId] as const,
  shopStatus: () => [...base.all, 'shop-status'] as const,
  transactions: () => [...base.all, 'transactions'] as const,
  usage: () => [...base.all, 'usage'] as const,
};

export const PLAN_MODULE_VERSION = '0.1.0';
