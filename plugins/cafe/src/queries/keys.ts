import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('cafe-kot');

export const cafeKotKeys = {
  ...base,
};

/**
 * Reference data the KOT screen reads but does not own — the menu it composes from and the
 * cashier's open bills, both served by `core/product`. Under their own domain so that
 * invalidating a tab never refetches the menu, and flushing never refetches it either.
 */
const screenBase = createQueryKeyFactory('cafe-kot-screen');

export const cafeKotScreenKeys = {
  ...screenBase,
  sellCatalog: () => [...screenBase.all, 'sell-catalog'] as const,
  openBills: () => [...screenBase.all, 'open-bills'] as const,
};

const tabBase = createQueryKeyFactory('cafe-tab');

export const cafeTabKeys = {
  ...tabBase,
  list: () => [...tabBase.all, 'list'] as const,
  detail: (tabId: string) => [...tabBase.all, 'detail', tabId] as const,
};
