import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('admin');

export const adminKeys = {
  ...base,
  me: () => [...base.all, 'me'] as const,
  admins: () => [...base.all, 'admins'] as const,
};
