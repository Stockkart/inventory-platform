import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import type { GlAccountResponse, PostManualJournalLineDto } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import styles from './dashboard.accounting.module.css';

export function meta() {
  return [
    { title: 'Manual journal - StockKart' },
    { name: 'description', content: 'Post balanced ledger entries between your chart accounts' },
  ];
}

type MjDraftLine = {
  key: string;
  accountCode: string;
  debit: string;
  credit: string;
  memo: string;
};

function newMjDraftLine(): MjDraftLine {
  return {
    key: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
    accountCode: '',
    debit: '',
    credit: '',
    memo: '',
  };
}

function parsePostingSideAmount(raw: string): number | undefined {
  const t = raw.replace(/,/g, '').trim();
  if (t === '') return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

export default function AccountingManualJournalPage() {
  const { success: notifySuccess, error: notifyError } = useNotify;
  const bootstrapped = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartAccounts, setChartAccounts] = useState<GlAccountResponse[]>([]);

  const mjChartSorted = useMemo(
    () =>
      [...chartAccounts]
        .filter((a) => a.active)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })),
    [chartAccounts]
  );

  const [mjLines, setMjLines] = useState<MjDraftLine[]>(() => [newMjDraftLine(), newMjDraftLine()]);
  const [mjDescription, setMjDescription] = useState('');
  const [mjSubmitting, setMjSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!bootstrapped.current) {
          await accountingApi.bootstrapChart();
          bootstrapped.current = true;
        }
        const chart = await accountingApi.glAccounts();
        if (!cancelled) setChartAccounts(chart);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load chart of accounts';
          setError(msg);
          notifyError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  async function handleManualJournalSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const desc = mjDescription.trim();
    if (!desc) {
      notifyError('Journal description is required');
      return;
    }
    const built: PostManualJournalLineDto[] = [];
    for (let i = 0; i < mjLines.length; i++) {
      const row = mjLines[i];
      const code = row.accountCode.trim();
      if (!code && !row.debit.trim() && !row.credit.trim() && !row.memo.trim()) continue;
      if (!code) {
        notifyError(`Line ${i + 1}: choose an account`);
        return;
      }
      const dr = parsePostingSideAmount(row.debit);
      const cr = parsePostingSideAmount(row.credit);
      if (dr !== undefined && cr !== undefined) {
        notifyError(`Line ${i + 1}: enter either debit or credit, not both`);
        return;
      }
      if (dr === undefined && cr === undefined) {
        notifyError(`Line ${i + 1}: enter a debit or credit amount`);
        return;
      }
      built.push({
        accountCode: code.toUpperCase(),
        debit: dr ?? null,
        credit: cr ?? null,
        memo: row.memo.trim() || null,
      });
    }
    if (built.length < 2) {
      notifyError('Provide at least two lines with amounts (journal must balance).');
      return;
    }
    let drTot = 0;
    let crTot = 0;
    for (const l of built) {
      drTot += Number(l.debit ?? 0);
      crTot += Number(l.credit ?? 0);
    }
    const balDiff = Math.abs(drTot - crTot);
    if (balDiff > 0.0001) {
      notifyError(
        `Debits (₹${formatMoney(drTot)}) must equal credits (₹${formatMoney(crTot)}).`
      );
      return;
    }
    setMjSubmitting(true);
    try {
      await accountingApi.postManualJournal({
        description: desc,
        lines: built,
      });
      notifySuccess('Journal posted');
      setMjDescription('');
      setMjLines([newMjDraftLine(), newMjDraftLine()]);
      const refreshed = await accountingApi.glAccounts();
      setChartAccounts(refreshed);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to post journal');
    } finally {
      setMjSubmitting(false);
    }
  }

  function updateMjRow(key: string, patch: Partial<Omit<MjDraftLine, 'key'>>) {
    setMjLines((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addMjRow() {
    setMjLines((prev) => [...prev, newMjDraftLine()]);
  }

  function removeMjRow(key: string) {
    setMjLines((prev) => (prev.length <= 2 ? prev : prev.filter((r) => r.key !== key)));
  }

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.overviewStack}>
        <section className={styles.card}>
          <h2 className={styles.cardHeading}>Manual journal</h2>
          <p className={styles.manualJournalIntro}>
            Move balances between ledger accounts — for example debit a bank asset and credit{' '}
            <span className={styles.mono}>CASH</span> when you lodge till cash. Requires at least two
            lines; total debits must equal total credits.{' '}
            <Link to="/dashboard/accounting" className={styles.manualJournalBackLink}>
              Journal register →
            </Link>
          </p>
          {loading ? (
            <p className={styles.manualJournalLoading}>Loading accounts…</p>
          ) : (
            <form className={styles.manualJournalForm} onSubmit={handleManualJournalSubmit}>
              <div className={styles.manualJournalField}>
                <label htmlFor="mj-desc">Description</label>
                <input
                  id="mj-desc"
                  value={mjDescription}
                  onChange={(ev) => setMjDescription(ev.target.value)}
                  placeholder="e.g. Transfer to HDFC · daily deposit"
                  maxLength={280}
                  autoComplete="off"
                  disabled={mjSubmitting}
                />
              </div>
              <div className={styles.manualJournalLinesWrap}>
                <table className={styles.manualJournalTable}>
                  <thead>
                    <tr>
                      <th scope="col">Account</th>
                      <th scope="col" style={{ width: '7.5rem' }}>
                        Debit ₹
                      </th>
                      <th scope="col" style={{ width: '7.5rem' }}>
                        Credit ₹
                      </th>
                      <th scope="col">Memo</th>
                      <th aria-label="Actions" scope="col" style={{ width: '2.5rem' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {mjLines.map((row, idx) => (
                      <tr key={row.key}>
                        <td>
                          <select
                            className={styles.mjAcctSelect}
                            value={row.accountCode}
                            onChange={(ev) => updateMjRow(row.key, { accountCode: ev.target.value })}
                            aria-label={`Account line ${idx + 1}`}
                            disabled={mjSubmitting}
                          >
                            <option value="">— Select —</option>
                            {mjChartSorted.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className={`${styles.mjAmtInput} ${styles.mono}`}
                            inputMode="decimal"
                            value={row.debit}
                            onChange={(ev) =>
                              updateMjRow(row.key, { debit: ev.target.value, credit: '' })
                            }
                            placeholder="0"
                            disabled={mjSubmitting}
                          />
                        </td>
                        <td>
                          <input
                            className={`${styles.mjAmtInput} ${styles.mono}`}
                            inputMode="decimal"
                            value={row.credit}
                            onChange={(ev) =>
                              updateMjRow(row.key, { credit: ev.target.value, debit: '' })
                            }
                            placeholder="0"
                            disabled={mjSubmitting}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.mjMemoInput}
                            value={row.memo}
                            onChange={(ev) => updateMjRow(row.key, { memo: ev.target.value })}
                            placeholder="Optional"
                            maxLength={200}
                            disabled={mjSubmitting}
                          />
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          {mjLines.length > 2 ? (
                            <button
                              type="button"
                              className={styles.mjRowRemove}
                              onClick={() => removeMjRow(row.key)}
                              disabled={mjSubmitting}
                              aria-label={`Remove line ${idx + 1}`}
                            >
                              ×
                            </button>
                          ) : (
                            <span className={styles.muted} aria-hidden />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.manualJournalToolbar}>
                <button
                  type="button"
                  className={styles.mjGhostBtn}
                  onClick={addMjRow}
                  disabled={mjSubmitting}
                >
                  Add line
                </button>
                <button type="submit" className={styles.mjSubmitBtn} disabled={mjSubmitting}>
                  {mjSubmitting ? 'Posting…' : 'Post journal'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
