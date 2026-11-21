import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('cafe-kot');

const menuBase = createQueryKeyFactory('cafe-menu');

export const cafeMenuKeys = {
  ...menuBase,
  /** Sell-direct stock lots a menu section can place, with their price and stock. */
  sellDirectLots: () => [...menuBase.all, 'sell-direct-lots'] as const,
};

export const cafeKotKeys = {
  ...base,
  /** Tickets already issued for one bill. Scoped by purchase so switching carts refetches. */
  billKots: (purchaseId: string) => [...base.all, 'bill', purchaseId] as const,
};
