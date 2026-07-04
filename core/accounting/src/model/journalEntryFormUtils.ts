import type { CreateJournalLineRequest } from '@inventory-platform/types';
import { needsPartyOnLine } from './accountingConstants';

export type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  memo: string;
  partyType?: 'CUSTOMER' | 'VENDOR';
  partyRefId?: string;
  partyDisplayName?: string;
};

export function emptyLine(): DraftLine {
  return { accountCode: '', debit: '', credit: '', memo: '' };
}

export function parseAmount(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function buildCleanedLines(lines: DraftLine[]): CreateJournalLineRequest[] | string {
  const cleaned = lines
    .map((l) => ({
      accountCode: l.accountCode.trim(),
      debit: parseAmount(l.debit),
      credit: parseAmount(l.credit),
      memo: l.memo.trim() || undefined,
      partyType: l.partyType,
      partyRefId: l.partyRefId?.trim() || undefined,
      partyDisplayName: l.partyDisplayName?.trim() || undefined,
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  if (cleaned.length < 2) {
    return 'Enter at least two effective lines.';
  }
  for (const l of cleaned) {
    if (!l.accountCode) {
      return 'Every effective line needs an account.';
    }
    if (l.debit > 0 && l.credit > 0) {
      return 'A single line cannot be both debit and credit.';
    }
    if (needsPartyOnLine(l.accountCode) && !l.partyRefId) {
      return `Select a ${l.accountCode === '1200' ? 'customer' : 'vendor'} for account ${l.accountCode}.`;
    }
  }
  return cleaned.map((l) => ({
    accountCode: l.accountCode,
    debit: l.debit > 0 ? l.debit : undefined,
    credit: l.credit > 0 ? l.credit : undefined,
    memo: l.memo,
    partyType: l.partyType,
    partyRefId: l.partyRefId,
    partyDisplayName: l.partyDisplayName,
  }));
}
