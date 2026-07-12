import { createQueryKeyFactory } from '@inventory-platform/query';
import type { ExpiryBucketsParams } from '../api/reminders.api';

const base = createQueryKeyFactory('reminders');

export const remindersKeys = {
  ...base,
  reminderDetails: (page: number, size: number) => [...base.all, 'details', page, size] as const,
  reminderDetail: (id: string) => [...base.all, 'detail', id] as const,
  expiryBuckets: (params: ExpiryBucketsParams) => [...base.all, 'expiry-buckets', params] as const,
  lowStock: (page: number, size: number) => [...base.all, 'low-stock', page, size] as const,
  inventoryItem: (id: string) => [...base.all, 'inventory-item', id] as const,
};

export const REMINDERS_MODULE_VERSION = '0.1.0';
