import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('cafe-kot');

export const cafeKotKeys = {
  ...base,
  /** Tickets already issued for one bill. Scoped by purchase so switching carts refetches. */
  billKots: (purchaseId: string) => [...base.all, 'bill', purchaseId] as const,
};
