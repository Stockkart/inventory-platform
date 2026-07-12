/** Credit REST paths (mirrors backend `/credit/*`). */
export const CREDIT_ENDPOINTS = {
  BASE: '/credit',
  CHARGE: '/credit/charge',
  SETTLEMENT: '/credit/settlement',
  ACCOUNTS: '/credit/accounts',
  ENTRIES: (accountId: string) => `/credit/accounts/${accountId}/entries`,
} as const;
