import type { TrialBalanceLine } from '@inventory-platform/types';
import { VENDOR_PAYABLE_CODE_PREFIX } from './accountingNominalUi';

/** Mirrors {@code TrialBalanceQueryService} display groups (Java). */
const CODE = {
  CASH: 'CASH',
  RECEIVABLES: 'RECEIVABLES',
  SALES: 'SALES',
  GST_OUTPUT: 'GST-OUTPUT',
  PURCHASES: 'PURCHASES',
  GST_INPUT: 'GST-INPUT',
  PAYABLES: 'PAYABLES',
  EQUITY: 'EQUITY',
} as const;

export type TrialBalanceGroupId = 10 | 20 | 30 | 40 | 99;

export function trialBalanceGroupKey(accountCode: string | undefined): {
  group: TrialBalanceGroupId;
  within: number;
} {
  const c = (accountCode ?? '').trim().toUpperCase();
  if (!c) {
    return { group: 99, within: 0 };
  }
  if (c === CODE.CASH) {
    return { group: 10, within: 0 };
  }
  if (c === CODE.RECEIVABLES) {
    return { group: 20, within: 1 };
  }
  if (c === CODE.SALES) {
    return { group: 20, within: 2 };
  }
  if (c === CODE.GST_OUTPUT) {
    return { group: 20, within: 3 };
  }
  if (c === CODE.PURCHASES) {
    return { group: 30, within: 0 };
  }
  if (c === CODE.GST_INPUT) {
    return { group: 30, within: 1 };
  }
  if (c.startsWith(VENDOR_PAYABLE_CODE_PREFIX.toUpperCase())) {
    return { group: 30, within: 2 };
  }
  if (c === CODE.PAYABLES) {
    return { group: 30, within: 3 };
  }
  if (c === CODE.EQUITY) {
    return { group: 40, within: 0 };
  }
  return { group: 99, within: 0 };
}

export function trialBalanceGroupTitle(group: number): string {
  switch (group) {
    case 10:
      return 'Liquidity';
    case 20:
      return 'Receivables, sales & output GST';
    case 30:
      return 'Purchases, input tax & payables';
    case 40:
      return 'Equity';
    default:
      return 'Other accounts';
  }
}

/** Same ordering as backend trial balance list. */
export function sortTrialBalanceLines(rows: TrialBalanceLine[]): TrialBalanceLine[] {
  return [...rows].sort((a, b) => {
    const ka = trialBalanceGroupKey(a.accountCode);
    const kb = trialBalanceGroupKey(b.accountCode);
    if (ka.group !== kb.group) {
      return ka.group - kb.group;
    }
    if (ka.within !== kb.within) {
      return ka.within - kb.within;
    }
    return String(a.accountCode ?? '').localeCompare(String(b.accountCode ?? ''), undefined, {
      sensitivity: 'base',
    });
  });
}
