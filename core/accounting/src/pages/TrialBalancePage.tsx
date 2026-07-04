import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  AccountType,
  TrialBalanceResponse,
  TrialBalanceRow,
} from '@inventory-platform/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from '../model/format';
import styles from '../ui/accounting.module.css';

const GROUP_ORDER: AccountType[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
];

const GROUP_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

export function TrialBalancePage() {
  const { error: notifyError } = useNotify;
  const [asOf, setAsOf] = useState<string>(todayLocalDate());
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.trialBalance(asOf || undefined);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load trial balance');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asOf, notifyError]);

  const grouped = useMemo(() => {
    const rows = data?.rows ?? [];
    const out: Record<AccountType, TrialBalanceRow[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    for (const r of rows) {
      out[r.accountType].push(r);
    }
    return out;
  }, [data]);

  function groupSubtotal(rows: TrialBalanceRow[]) {
    let dr = 0;
    let cr = 0;
    rows.forEach((r) => {
      dr += r.debitBalance;
      cr += r.creditBalance;
    });
    return { dr, cr };
  }

  const isBalanced =
    !!data && Math.abs(data.totalDebit - data.totalCredit) < 0.005;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Trial Balance</h1>
            <p className={styles.subtitle}>
              Closing balances as of a date. Total Debit must equal Total Credit — if they
              don&apos;t, no entry can be unbalanced.
            </p>
          </div>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <label className={styles.muted}>As of</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
          <span className={styles.muted}>{data ? `· ${formatDate(data.asOf)}` : ''}</span>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : !data || data.rows.length === 0 ? (
          <p className={styles.empty}>
            No postings yet. Once you register vendor invoices or post journals, the trial
            balance will populate.
          </p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th className={styles.right}>Debit Turnover</th>
                  <th className={styles.right}>Credit Turnover</th>
                  <th className={styles.right}>Debit Balance</th>
                  <th className={styles.right}>Credit Balance</th>
                </tr>
              </thead>
              <tbody>
                {GROUP_ORDER.map((type) => {
                  const rows = grouped[type];
                  if (rows.length === 0) return null;
                  const sub = groupSubtotal(rows);
                  return (
                    <RowsForType
                      key={type}
                      type={type}
                      rows={rows}
                      subDr={sub.dr}
                      subCr={sub.cr}
                    />
                  );
                })}
                <tr className={styles.grandTotalRow}>
                  <td colSpan={4} className={styles.right}>
                    Grand Totals
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {formatMoney(data.totalDebit)}
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {formatMoney(data.totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p
              className={
                isBalanced ? styles.balanceBalanced : styles.balanceUnbalanced
              }
              style={{ marginTop: '0.85rem', fontWeight: 700 }}
            >
              {isBalanced
                ? '✓ Books balance — total debits = total credits'
                : '⚠ Trial balance does not match — investigate immediately'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RowsForType({
  type,
  rows,
  subDr,
  subCr,
}: {
  type: AccountType;
  rows: TrialBalanceRow[];
  subDr: number;
  subCr: number;
}) {
  return (
    <>
      <tr>
        <td colSpan={6} className={styles.groupHeading}>
          {GROUP_LABEL[type]}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.accountId}>
          <td className={styles.muted}>{r.accountCode}</td>
          <td>
            <Link to={`/dashboard/accounting/ledger/${r.accountId}`}>
              {r.accountName}
            </Link>
          </td>
          <td className={`${styles.right} ${styles.number}`}>
            {formatMoney(r.debitTurnover)}
          </td>
          <td className={`${styles.right} ${styles.number}`}>
            {formatMoney(r.creditTurnover)}
          </td>
          <td className={`${styles.right} ${styles.number}`}>
            {r.debitBalance ? formatMoney(r.debitBalance) : ''}
          </td>
          <td className={`${styles.right} ${styles.number}`}>
            {r.creditBalance ? formatMoney(r.creditBalance) : ''}
          </td>
        </tr>
      ))}
      <tr className={styles.subTotalRow}>
        <td colSpan={4} className={styles.right}>
          {GROUP_LABEL[type]} subtotal
        </td>
        <td className={`${styles.right} ${styles.number}`}>{formatMoney(subDr)}</td>
        <td className={`${styles.right} ${styles.number}`}>{formatMoney(subCr)}</td>
      </tr>
    </>
  );
}
