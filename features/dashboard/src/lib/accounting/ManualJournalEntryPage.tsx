import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import { useNotify } from '@inventory-platform/store';
import type {
  AccountResponse,
  CreateJournalEntryRequest,
} from '@inventory-platform/types';
import { AccountingTabs } from './AccountingTabs';
import { formatMoney, todayLocalDate } from './format';
import styles from './accounting.module.css';

type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  memo: string;
};

function emptyLine(): DraftLine {
  return { accountCode: '', debit: '', credit: '', memo: '' };
}

function parseAmount(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ManualJournalEntryPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [txnDate, setTxnDate] = useState<string>(todayLocalDate());
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      try {
        const rows = await accountingApi.accounts();
        if (!cancelled) setAccounts(rows);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load accounts');
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const { totalDebit, totalCredit, balanced } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const l of lines) {
      d += parseAmount(l.debit);
      c += parseAmount(l.credit);
    }
    const diff = Math.abs(d - c);
    return { totalDebit: d, totalCredit: c, balanced: diff < 0.005 && d > 0 };
  }, [lines]);

  function patchLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line))
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function submit() {
    if (!balanced) {
      notifyError('Entry is unbalanced. Debits must equal credits and be greater than 0.');
      return;
    }
    const cleanedLines = lines
      .map((l) => ({
        accountCode: l.accountCode.trim(),
        debit: parseAmount(l.debit),
        credit: parseAmount(l.credit),
        memo: l.memo.trim() || undefined,
      }))
      .filter((l) => l.debit > 0 || l.credit > 0);

    if (cleanedLines.length < 2) {
      notifyError('Enter at least two effective lines.');
      return;
    }
    for (const l of cleanedLines) {
      if (!l.accountCode) {
        notifyError('Every effective line needs an account.');
        return;
      }
      if (l.debit > 0 && l.credit > 0) {
        notifyError('A single line cannot be both debit and credit.');
        return;
      }
    }

    const body: CreateJournalEntryRequest = {
      txnDate,
      narration: narration.trim() || undefined,
      lines: cleanedLines.map((l) => ({
        accountCode: l.accountCode,
        debit: l.debit > 0 ? l.debit : undefined,
        credit: l.credit > 0 ? l.credit : undefined,
        memo: l.memo,
      })),
    };

    setSubmitting(true);
    try {
      const posted = await accountingApi.createManualJournal(body);
      notifySuccess(`Posted ${posted.entryNo}`);
      navigate(`/dashboard/accounting/journal/${posted.id}`);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to post entry');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Manual Journal Entry</h1>
            <p className={styles.subtitle}>
              <Link to="/dashboard/accounting/journal">← Back to journal</Link> · Posts with source{' '}
              <code>MANUAL</code>.
            </p>
          </div>
        </div>
        <AccountingTabs />
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar} style={{ marginBottom: '0.75rem' }}>
          <label className={styles.muted}>Date</label>
          <input
            type="date"
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
          />
          <label className={styles.muted}>Narration</label>
          <input
            type="text"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="What is this entry about?"
            style={{ flex: 1, minWidth: '14rem' }}
          />
        </div>

        <div className={styles.headerLineGrid}>
          <span>Account</span>
          <span className={styles.right}>Debit</span>
          <span className={styles.right}>Credit</span>
          <span>Memo</span>
          <span />
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className={styles.lineGrid}>
            <select
              value={line.accountCode}
              onChange={(e) => patchLine(idx, { accountCode: e.target.value })}
              disabled={accountsLoading}
            >
              <option value="">— Select account —</option>
              {accounts
                .filter((a) => a.active)
                .map((a) => (
                  <option key={a.id} value={a.code}>
                    {a.code} · {a.name}
                  </option>
                ))}
            </select>
            <input
              className={styles.right}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={line.debit}
              onChange={(e) =>
                patchLine(idx, {
                  debit: e.target.value,
                  credit: e.target.value ? '' : line.credit,
                })
              }
              placeholder="0.00"
            />
            <input
              className={styles.right}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={line.credit}
              onChange={(e) =>
                patchLine(idx, {
                  credit: e.target.value,
                  debit: e.target.value ? '' : line.debit,
                })
              }
              placeholder="0.00"
            />
            <input
              type="text"
              value={line.memo}
              onChange={(e) => patchLine(idx, { memo: e.target.value })}
              placeholder="Optional"
            />
            <button
              className={styles.removeBtn}
              title="Remove line"
              aria-label="Remove line"
              onClick={() => removeLine(idx)}
              disabled={lines.length <= 2}
            >
              ×
            </button>
          </div>
        ))}
        <button className={styles.btnGhost} onClick={addLine}>
          + Add line
        </button>

        <div
          className={`${styles.balanceFooter} ${
            balanced ? styles.balanceBalanced : styles.balanceUnbalanced
          }`}
        >
          <span>Total Debit: ₹ {formatMoney(totalDebit)}</span>
          <span>Total Credit: ₹ {formatMoney(totalCredit)}</span>
          <span>
            Difference: ₹ {formatMoney(Math.abs(totalDebit - totalCredit))}{' '}
            {balanced ? '✓ Balanced' : '· Must be 0 to save'}
          </span>
        </div>
        <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem' }}>
          <button
            className={styles.btnPrimary}
            onClick={submit}
            disabled={submitting || !balanced}
          >
            {submitting ? 'Posting…' : 'Post Entry'}
          </button>
          <Link to="/dashboard/accounting/journal" className={styles.btnGhost}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
