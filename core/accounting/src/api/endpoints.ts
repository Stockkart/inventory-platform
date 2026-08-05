/** Accounting REST paths (mirrors backend `/accounting/*`). */
export const ACCOUNTING_ENDPOINTS = {
  BASE: '/accounting',
  ACCOUNTS: '/accounting/accounts',
  ACCOUNT_BY_ID: (id: string) => `/accounting/accounts/${id}`,
  JOURNAL: '/accounting/journal-entries',
  JOURNAL_BY_ID: (id: string) => `/accounting/journal-entries/${id}`,
  JOURNAL_REVERSE: (id: string) => `/accounting/journal-entries/${id}/reverse`,
  LEDGER: (accountId: string) => `/accounting/ledger/${accountId}`,
  PARTIES: '/accounting/parties',
  PARTY_STATEMENT: (type: string, partyRefId: string) =>
    `/accounting/parties/${type}/${partyRefId}/statement`,
  TRIAL_BALANCE: '/accounting/reports/trial-balance',
  PROFIT_AND_LOSS: '/accounting/reports/profit-and-loss',
  BALANCE_SHEET: '/accounting/reports/balance-sheet',
  OPENING_BALANCES: '/accounting/opening-balances',
  OPENING_BALANCES_STATUS: '/accounting/opening-balances/status',
  BACKFILL: '/accounting/admin/backfill',
} as const;
