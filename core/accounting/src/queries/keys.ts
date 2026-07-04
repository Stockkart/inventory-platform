import { createQueryKeyFactory } from '@inventory-platform/query';

/** Query keys for the accounting domain. Extend in Phase 2a. */
export const accountingKeys = createQueryKeyFactory('accounting');

/** Phase 2a: migrate journal, ledger, and report pages from features/dashboard. */
export const ACCOUNTING_MODULE_VERSION = '0.0.1-scaffold';
