import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useNotify } from '@inventory-platform/session';
import type { JournalEntryResponse, JournalSource } from '@inventory-platform/types';
import { useJournalsQuery } from '../queries/hooks';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

const SOURCE_OPTIONS: ReadonlyArray<{ value: '' | JournalSource; label: string }> = [
  { value: '', label: 'All sources' },
  { value: 'VENDOR_PURCHASE_INVOICE', label: 'Vendor Purchase' },
  { value: 'VENDOR_PURCHASE_RETURN', label: 'Vendor Return' },
  { value: 'SALE', label: 'Sale' },
  { value: 'SALES_RETURN', label: 'Sales Return' },
  { value: 'CUSTOMER_SETTLEMENT', label: 'Customer Settlement' },
  { value: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
  { value: 'INVENTORY_CORRECTION', label: 'Inventory Correction' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'REVERSAL', label: 'Reversal' },
  { value: 'OPENING_BALANCE', label: 'Opening Balance' },
];

export function JournalEntriesPage() {
  const { error: notifyError } = useNotify;
  const [source, setSource] = useState<'' | JournalSource>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useJournalsQuery({
    sourceType: source || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    size: 20,
  });

  useEffect(() => {
    if (isError) {
      notifyError(error instanceof Error ? error.message : 'Failed to load journal entries');
    }
  }, [isError, error, notifyError]);

  const entries = useMemo<JournalEntryResponse[]>(() => data?.entries ?? [], [data]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Journal Entries</h1>
            <p className={styles.subtitle}>
              Every business event creates a balanced journal entry. Filter, drill in, or post a
              manual entry.
            </p>
          </div>
          <Link
            to="/dashboard/accounting/journal/new"
            className={styles.btnPrimary}
            style={{ textDecoration: 'none' }}
          >
            + Manual Entry
          </Link>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <label className={styles.muted} htmlFor="source">
            Source
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => {
              setPage(0);
              setSource(e.target.value as '' | JournalSource);
            }}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className={styles.muted} htmlFor="from">
            From
          </label>
          <input
            id="from"
            type="date"
            value={from}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value);
            }}
          />
          <label className={styles.muted} htmlFor="to">
            To
          </label>
          <input
            id="to"
            type="date"
            value={to}
            onChange={(e) => {
              setPage(0);
              setTo(e.target.value);
            }}
          />
          <button
            className={styles.btnGhost}
            onClick={() => {
              setSource('');
              setFrom('');
              setTo('');
              setPage(0);
            }}
            disabled={!source && !from && !to}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className={styles.empty}>No journal entries match your filters.</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entry #</th>
                  <th>Source</th>
                  <th>Narration</th>
                  <th className={styles.right}>Debit</th>
                  <th className={styles.right}>Credit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.txnDate)}</td>
                    <td>
                      <Link to={`/dashboard/accounting/journal/${e.id}`}>{e.entryNo}</Link>
                    </td>
                    <td>
                      <span className={styles.sourcePill}>{e.sourceType}</span>
                    </td>
                    <td className={styles.muted}>{e.narration ?? '—'}</td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {formatMoney(e.totalDebit)}
                    </td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {formatMoney(e.totalCredit)}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          e.status === 'POSTED'
                            ? styles.statusPosted
                            : e.status === 'REVERSED'
                              ? styles.statusReversed
                              : styles.statusVoid
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              className={styles.toolbar}
              style={{ justifyContent: 'space-between', marginTop: '0.6rem' }}
            >
              <span className={styles.muted}>
                Page {data ? data.page + 1 : 1} of {data?.totalPages || 1} ·{' '}
                {data?.totalItems ?? 0} entries
              </span>
              <div>
                <button
                  className={styles.btnSecondary}
                  disabled={!data || data.page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Prev
                </button>{' '}
                <button
                  className={styles.btnSecondary}
                  disabled={!data || data.page + 1 >= (data?.totalPages ?? 0)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
