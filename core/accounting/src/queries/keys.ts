import { createQueryKeyFactory } from '@inventory-platform/query';
import type {
  JournalListParams,
  LedgerParams,
  PartiesListParams,
  PartyStatementParams,
} from '../api/accounting.api';

const base = createQueryKeyFactory('accounting');

export const accountingKeys = {
  ...base,
  accounts: () => [...base.all, 'accounts'] as const,
  journals: (params: JournalListParams = {}) =>
    [...base.all, 'journals', params] as const,
  journal: (id: string) => [...base.all, 'journal', id] as const,
  ledger: (accountId: string, params: LedgerParams = {}) =>
    [...base.all, 'ledger', accountId, params] as const,
  parties: (params: PartiesListParams) =>
    [...base.all, 'parties', params] as const,
  partyStatement: (
    type: PartiesListParams['type'],
    partyRefId: string,
    params: PartyStatementParams = {}
  ) => [...base.all, 'partyStatement', type, partyRefId, params] as const,
  trialBalance: (asOf?: string) => [...base.all, 'trialBalance', asOf ?? ''] as const,
  profitAndLoss: (from: string, to: string) =>
    [...base.all, 'profitAndLoss', from, to] as const,
  balanceSheet: (asOf?: string) => [...base.all, 'balanceSheet', asOf ?? ''] as const,
  openingBalanceStatus: () => [...base.all, 'openingBalanceStatus'] as const,
};

export const ACCOUNTING_MODULE_VERSION = '0.1.0';
