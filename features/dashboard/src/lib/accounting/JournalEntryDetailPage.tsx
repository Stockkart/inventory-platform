import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import { useNotify } from '@inventory-platform/store';
import type { JournalEntryResponse } from '@inventory-platform/types';
import { AccountingTabs } from './AccountingTabs';
import { formatDateTime, formatDate, formatMoney } from './format';
import styles from './accounting.module.css';

export function JournalEntryDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const entryId = params.entryId ?? '';
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [entry, setEntry] = useState<JournalEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(false);

  const reload = useCallback(async () => {
    if (!entryId) return;
    setLoading(true);
    try {
      const e = await accountingApi.journal(entryId);
      setEntry(e);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  }, [entryId, notifyError]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function reverse() {
    if (!entry) return;
    const reason = window.prompt(
      'Reason for reversal (optional). The original entry will be marked REVERSED and a mirroring reversal entry will be posted.'
    );
    if (reason == null) return;
    setReversing(true);
    try {
      const reversal = await accountingApi.reverseJournal(entry.id, { reason });
      notifySuccess(`Reversal posted: ${reversal.entryNo}`);
      navigate(`/dashboard/accounting/journal/${reversal.id}`);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to reverse entry');
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Journal Entry</h1>
            <p className={styles.subtitle}>
              <Link to="/dashboard/accounting/journal">← Back to journal</Link>
            </p>
          </div>
          {entry && entry.status === 'POSTED' && (
            <button
              className={styles.btnSecondary}
              onClick={reverse}
              disabled={reversing}
            >
              {reversing ? 'Reversing…' : 'Reverse entry'}
            </button>
          )}
        </div>
        <AccountingTabs />
      </div>

      <div className={styles.card}>
        {loading || !entry ? (
          <p className={styles.empty}>{loading ? 'Loading…' : 'Entry not found'}</p>
        ) : (
          <>
            <table className={styles.table} style={{ marginBottom: '1rem' }}>
              <tbody>
                <Row label="Entry #" value={entry.entryNo} />
                <Row label="Transaction Date" value={formatDate(entry.txnDate)} />
                <Row label="Posted At" value={formatDateTime(entry.postedAt)} />
                <Row
                  label="Source"
                  value={
                    <>
                      <span className={styles.sourcePill}>{entry.sourceType}</span>{' '}
                      {entry.sourceId && (
                        <code className={styles.muted}>{entry.sourceId}</code>
                      )}
                    </>
                  }
                />
                <Row
                  label="Status"
                  value={
                    <span
                      className={`${styles.statusPill} ${
                        entry.status === 'POSTED'
                          ? styles.statusPosted
                          : entry.status === 'REVERSED'
                            ? styles.statusReversed
                            : styles.statusVoid
                      }`}
                    >
                      {entry.status}
                    </span>
                  }
                />
                {entry.reversesEntryId && (
                  <Row
                    label="Reverses"
                    value={
                      <Link to={`/dashboard/accounting/journal/${entry.reversesEntryId}`}>
                        {entry.reversesEntryId}
                      </Link>
                    }
                  />
                )}
                {entry.reversedByEntryId && (
                  <Row
                    label="Reversed By"
                    value={
                      <Link to={`/dashboard/accounting/journal/${entry.reversedByEntryId}`}>
                        {entry.reversedByEntryId}
                      </Link>
                    }
                  />
                )}
                <Row label="Narration" value={entry.narration ?? '—'} />
              </tbody>
            </table>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Party</th>
                  <th>Memo</th>
                  <th className={styles.right}>Debit</th>
                  <th className={styles.right}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((l) => (
                  <tr key={l.lineIndex}>
                    <td>
                      <Link to={`/dashboard/accounting/ledger/${l.accountId}`}>
                        {l.accountCode} · {l.accountName}
                      </Link>
                    </td>
                    <td className={styles.muted}>
                      {l.partyType
                        ? `${l.partyType}${
                            l.partyDisplayName ? ` · ${l.partyDisplayName}` : ''
                          }`
                        : '—'}
                    </td>
                    <td className={styles.muted}>{l.memo ?? '—'}</td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {l.debit ? formatMoney(l.debit) : ''}
                    </td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {l.credit ? formatMoney(l.credit) : ''}
                    </td>
                  </tr>
                ))}
                <tr className={styles.grandTotalRow}>
                  <td colSpan={3} className={styles.right}>
                    Totals
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {formatMoney(entry.totalDebit)}
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {formatMoney(entry.totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <th style={{ width: '12rem' }}>{label}</th>
      <td>{value}</td>
    </tr>
  );
}
