import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import type {
  GlAccountResponse,
  JournalEntryResponse,
  JournalLineResponse,
  TrialBalanceLine,
} from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import { isVendorPayableNominalCode, nominalCodeLabelForUi } from '../accountingNominalUi';
import {
  sortTrialBalanceLines,
  trialBalanceGroupKey,
  trialBalanceGroupTitle,
} from '../trialBalanceDisplay';
import { formatJournalHeadingForDisplay, formatJournalMemoForDisplay } from '../journalUi';
import styles from './dashboard.accounting.module.css';

export function meta() {
  return [
    { title: 'Accounting - StockKart' },
    { name: 'description', content: 'Journal entries by transaction and trial balance' },
  ];
}

const JOURNAL_PAGE_SIZE = 50;

function sortedJournalLines(lines: JournalLineResponse[] | undefined): JournalLineResponse[] {
  if (!lines?.length) return [];
  return [...lines].sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0));
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

function formatTrialAmount(
  raw: number | undefined,
  side: 'debit' | 'credit'
): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) {
    return '—';
  }
  const amt = formatMoney(n);
  return side === 'debit' ? `${amt} Dr` : `${amt} Cr`;
}

export default function AccountingOverviewPage() {
  const { error: notifyError } = useNotify;
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialRows, setTrialRows] = useState<TrialBalanceLine[]>([]);
  const [journals, setJournals] = useState<JournalEntryResponse[]>([]);
  const [journalMeta, setJournalMeta] = useState({ totalItems: 0, shown: JOURNAL_PAGE_SIZE });
  const [chartAccounts, setChartAccounts] = useState<GlAccountResponse[]>([]);
  const bootstrapped = useRef(false);

  const chartByAccountId = useMemo(() => {
    const m = new Map<string, GlAccountResponse>();
    for (const a of chartAccounts) {
      m.set(a.id, a);
    }
    return m;
  }, [chartAccounts]);

  const totalRow = useMemo(
    () => trialRows.find((r) => r.accountCode === '__TOTAL__'),
    [trialRows]
  );
  const tbData = useMemo(
    () => trialRows.filter((r) => r.accountCode !== '__TOTAL__'),
    [trialRows]
  );
  const tbSorted = useMemo(() => sortTrialBalanceLines(tbData), [tbData]);

  useEffect(() => {
    if (!highlightId || loading || !journals.length) return;
    const el = document.getElementById(`je-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, loading, journals]);

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
        const [tb, jList, chart] = await Promise.all([
          accountingApi.trialBalance(),
          accountingApi.listJournals(0, JOURNAL_PAGE_SIZE),
          accountingApi.glAccounts(),
        ]);
        if (!cancelled) {
          setTrialRows(tb);
          setJournals(jList.journals ?? []);
          setJournalMeta({
            totalItems: jList.totalItems ?? 0,
            shown: Math.min(JOURNAL_PAGE_SIZE, jList.journals?.length ?? 0),
          });
          setChartAccounts(chart);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load accounting data';
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

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : (
        <div className={styles.overviewStack}>
          <section className={styles.card}>
            <h2 className={styles.cardHeading}>Journal entries</h2>
            <p className={styles.cardIntro}>
              Each row is a ledger line. Chart descriptions sit under the account code or name — use the{' '}
              <Link to="/dashboard/accounting/manual-journal" className={styles.cardIntroLink}>
                Manual journal
              </Link>{' '}
              tab for transfers between accounts.
            </p>
            {!journals.length ? (
              <p className={styles.empty}>
                No journals yet — use Checkout (sale) or Product registration bulk save (purchase).
              </p>
            ) : (
              <>
                <p className={styles.journalMetaHint}>
                  {journalMeta.totalItems > journalMeta.shown
                    ? `Newest ${journalMeta.shown} of ${journalMeta.totalItems} journals.`
                    : `${journalMeta.totalItems} journal${journalMeta.totalItems === 1 ? '' : 's'} · newest first.`}
                </p>
                <div className={styles.tableWrap}>
                  <table className={`${styles.table} ${styles.journalRegisterTable}`}>
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col" className={styles.journalColType}>
                          Type
                        </th>
                        <th scope="col">Reference</th>
                        <th scope="col">Account</th>
                        <th scope="col">Memo</th>
                        <th className={styles.journalAmtHead} scope="col">
                          Debit
                        </th>
                        <th className={styles.journalAmtHead} scope="col">
                          Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {journals.flatMap((j, journalIdx) => {
                        const isHi = Boolean(highlightId && j.id === highlightId);
                        const lines = sortedJournalLines(j.lines);
                        const rowSpan = Math.max(lines.length, 1);
                        const groupStripe =
                          journalIdx % 2 === 0 ? styles.journalTbGroupAlt : '';

                        const postedAt = new Date(j.postedAt);
                        const dateStr = postedAt.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const timeStr = postedAt.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const headPosted = (
                          <time dateTime={j.postedAt} className={styles.journalPosted}>
                            {dateStr}
                            {'\n'}
                            {timeStr}
                          </time>
                        );

                        const headType =
                          j.source === 'SALE' ? (
                            <span className={styles.pillSale}>Sale</span>
                          ) : j.source === 'PURCHASE' ? (
                            <span className={styles.pillPurchase}>Purchase</span>
                          ) : j.source === 'MANUAL' || j.source === 'SYSTEM' ? (
                            <span className={styles.pillNeutral}>{j.source}</span>
                          ) : (
                            <span className={styles.pillNeutral}>{j.source ?? '—'}</span>
                          );

                        const headJournal = (
                          <div className={styles.journalHeadStack}>
                            <div className={styles.journalTbHead}>
                              {formatJournalHeadingForDisplay(j.description)}
                            </div>
                            <div className={styles.journalTbTotalsInline} aria-label="Journal totals">
                              ₹{formatMoney(Number(j.totalDebitSum ?? 0))} Dr · ₹
                              {formatMoney(Number(j.totalCreditSum ?? 0))} Cr
                            </div>
                          </div>
                        );

                        const rowHi = isHi ? styles.journalTbRowHi : '';

                        if (!lines.length) {
                          const div = journalIdx > 0 ? styles.journalGroupDivider : '';
                          return [
                            <tr
                              key={j.id}
                              id={`je-${j.id}`}
                              data-journal-register
                              className={`${groupStripe} ${rowHi} ${div}`}
                            >
                              <td>{headPosted}</td>
                              <td>{headType}</td>
                              <td>{headJournal}</td>
                              <td colSpan={2} className={styles.journalMutedCell}>
                                No lines
                              </td>
                              <td className={`${styles.mono} ${styles.journalAmt}`}>—</td>
                              <td className={`${styles.mono} ${styles.journalAmt}`}>—</td>
                            </tr>,
                          ];
                        }

                        return lines.map((ln, lineIdx) => {
                          const gl = ln.accountId ? chartByAccountId.get(ln.accountId) : undefined;
                          const vendor = isVendorPayableNominalCode(ln.accountCode);
                          const acctLabel = nominalCodeLabelForUi(ln.accountCode, gl?.name);
                          const sub = vendor
                            ? ''
                            : (gl?.name?.trim() ? gl.name.trim() : '');
                          const isCashOrBank =
                            ln.accountCode === 'CASH' ||
                            (ln.accountCode ?? '').toUpperCase().startsWith('BANK');
                          const cashDirection: 'in' | 'out' | null = isCashOrBank
                            ? (ln.debit && Number(ln.debit) > 0 ? 'in' : ln.credit && Number(ln.credit) > 0 ? 'out' : null)
                            : null;
                          const tip =
                            [acctLabel, gl?.name].filter((s) => s && String(s).trim()).join(' — ') ||
                            undefined;
                          const groupDivider =
                            journalIdx > 0 && lineIdx === 0 ? styles.journalGroupDivider : '';
                          return (
                            <tr
                              key={`${j.id}-${ln.lineNo}-${ln.accountCode}`}
                              id={lineIdx === 0 ? `je-${j.id}` : undefined}
                              data-journal-register
                              className={`${groupStripe} ${rowHi} ${groupDivider}`}
                            >
                              {lineIdx === 0 ? (
                                <>
                                  <td rowSpan={rowSpan} className={styles.journalTbSpanCell}>
                                    {headPosted}
                                  </td>
                                  <td rowSpan={rowSpan} className={styles.journalTbSpanCell}>
                                    {headType}
                                  </td>
                                  <td rowSpan={rowSpan} className={styles.journalTbSpanCell}>
                                    {headJournal}
                                  </td>
                                </>
                              ) : null}
                              <td className={styles.journalAcctCell} title={tip}>
                                <span
                                  className={
                                    vendor ? styles.journalAcctPrimary : `${styles.journalAcctPrimary} ${styles.mono}`
                                  }
                                >
                                  {acctLabel}
                                  {cashDirection === 'in' && (
                                    <span className={styles.directionBadgeIn}>IN</span>
                                  )}
                                  {cashDirection === 'out' && (
                                    <span className={styles.directionBadgeOut}>OUT</span>
                                  )}
                                </span>
                                {sub && sub !== acctLabel ? (
                                  <span
                                    className={
                                      vendor
                                        ? `${styles.journalAcctSub} ${styles.mono}`
                                        : styles.journalAcctSub
                                    }
                                  >
                                    {sub}
                                  </span>
                                ) : null}
                              </td>
                              <td className={styles.journalMemoCell}>
                                {formatJournalMemoForDisplay(ln.memo) || '—'}
                              </td>
                              <td className={`${styles.mono} ${styles.journalAmt}`}>
                                {formatTrialAmount(ln.debit, 'debit')}
                              </td>
                              <td className={`${styles.mono} ${styles.journalAmt}`}>
                                {formatTrialAmount(ln.credit, 'credit')}
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
                <p className={styles.journalFootnote}>
                  Automated postings from Checkout and product registration.{' '}
                  <Link className={styles.cardIntroLink} to="/dashboard/accounting/manual-journal">
                    Manual journal
                  </Link>{' '}
                  tab covers transfers between accounts.
                </p>
              </>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardHeading}>Trial balance</h2>
            <p className={styles.cardIntro}>
              Net activity <strong>per chart account</strong> after combining every journal above
              (not by transaction). Rows are <strong>grouped by category</strong>. <strong>CASH</strong>{' '}
              is receipts from sales; purchase cost accumulates under <strong>PURCHASES</strong> until
              you settle in cash.
            </p>
            {tbData.length === 0 ? (
              <div className={styles.emptyBlock}>
                <p className={styles.empty}>No postings yet — trial balance stays at zero.</p>
                <p className={styles.emptyHint}>
                  Purchase journals post from vendor product registration when amounts are positive
                  (invoice total, line subtotal + tax, or cost/PTR × qty). Stock cost posts to{' '}
                  <strong>PURCHASES</strong>; the vendor nominal is credited, not cash, until payment.
                  Complete a checkout for a SALE journal — choose <strong>CASH</strong> or a bank
                  account as the debit (receipt) side.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let prevGroup: number | undefined;
                      const out: ReactNode[] = [];
                      for (const r of tbSorted) {
                        const { group } = trialBalanceGroupKey(r.accountCode);
                        if (prevGroup !== group) {
                          out.push(
                            <tr
                              key={`tb-h-${group}-${r.accountCode}`}
                              className={styles.tbGroupRow}
                            >
                              <td colSpan={4}>{trialBalanceGroupTitle(group)}</td>
                            </tr>
                          );
                          prevGroup = group;
                        }
                        out.push(
                          <tr key={r.accountCode}>
                            <td
                              className={
                                isVendorPayableNominalCode(r.accountCode) ? undefined : styles.mono
                              }
                            >
                              {nominalCodeLabelForUi(r.accountCode, r.accountName)}
                            </td>
                            <td>{r.accountName}</td>
                            <td className={styles.mono} style={{ textAlign: 'right' }}>
                              {formatTrialAmount(r.debit, 'debit')}
                            </td>
                            <td className={styles.mono} style={{ textAlign: 'right' }}>
                              {formatTrialAmount(r.credit, 'credit')}
                            </td>
                          </tr>
                        );
                      }
                      return out;
                    })()}
                    {totalRow && (
                      <tr className={styles.rowTotal}>
                        <td colSpan={2}>Total</td>
                        <td className={styles.mono} style={{ textAlign: 'right' }}>
                          {formatTrialAmount(totalRow.debit, 'debit')}
                        </td>
                        <td className={styles.mono} style={{ textAlign: 'right' }}>
                          {formatTrialAmount(totalRow.credit, 'credit')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <p style={{ marginTop: '1.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <Link to="/dashboard/history">View sales history</Link>
        {' · '}
        <Link to="/dashboard/taxes">Tax reports</Link>
      </p>
    </>
  );
}
