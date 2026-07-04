import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('credit');

export const creditKeys = {
  ...base,
  accounts: () => [...base.all, 'accounts'] as const,
  entries: (accountId: string, page = 0, size = 20) =>
    [...base.all, 'entries', accountId, page, size] as const,
};

export const CREDIT_MODULE_VERSION = '0.1.0';
