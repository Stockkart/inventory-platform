import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('cafe-kot');

export const cafeKotKeys = {
  ...base,
};

const tabBase = createQueryKeyFactory('cafe-tab');

export const cafeTabKeys = {
  ...tabBase,
  list: () => [...tabBase.all, 'list'] as const,
  detail: (tabId: string) => [...tabBase.all, 'detail', tabId] as const,
};
