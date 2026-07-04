import { createQueryKeyFactory } from '@inventory-platform/query';

const base = createQueryKeyFactory('taxation');

export const taxationKeys = {
  ...base,
  gstr1Report: (period: string) => [...base.all, 'gstr1', period] as const,
  gstr2Report: (period: string) => [...base.all, 'gstr2', period] as const,
  gstr3bReport: (period: string) => [...base.all, 'gstr3b', period] as const,
};

export const TAXATION_MODULE_VERSION = '0.1.0';
