import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { ProfitAndLossResponse } from '@inventory-platform/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from '../model/format';
import styles from '../ui/accounting.module.css';

function monthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function ProfitAndLossPage() {
  const { error: notifyError } = useNotify;
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayLocalDate());
  const [data, setData] = useState<ProfitAndLossResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.profitAndLoss(from, to);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load P&L');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, notifyError]);

  const netTone = useMemo(() => {
    if (!data) return undefined;
    return data.netProfit >= 0 ? 'positive' : 'warning';
  }, [data]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Profit & Loss</h1>
            <p className={styles.subtitle}>
              Revenue and expense accounts for the selected period (turnover, not closing balances).
            </p>
          </div>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <label className={styles.muted}>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className={styles.muted}>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : !data ? (
        <p className={styles.empty}>No data.</p>
      ) : (
        <>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Total revenue</p>
              <p className={styles.kpiValue}>₹ {formatMoney(data.totalRevenue)}</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Total expenses</p>
              <p className={styles.kpiValue}>₹ {formatMoney(data.totalExpense)}</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Net profit</p>
              <p
                className={styles.kpiValue}
                style={{ color: netTone === 'positive' ? '#047857' : '#b45309' }}
              >
                ₹ {formatMoney(data.netProfit)}
              </p>
            </div>
          </div>

          <ReportSection title="Revenue" rows={data.revenueLines} emptyLabel="No revenue in period" />
          <ReportSection title="Expenses" rows={data.expenseLines} emptyLabel="No expenses in period" />

          <p className={styles.muted} style={{ marginTop: '0.75rem' }}>
            Period {formatDate(data.from)} – {formatDate(data.to)} ·{' '}
            <Link to="/dashboard/accounting/trial-balance">Trial balance</Link>
          </p>
        </>
      )}
    </div>
  );
}

function ReportSection({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: ProfitAndLossResponse['revenueLines'];
  emptyLabel: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className={styles.card} style={{ marginTop: '0.75rem' }}>
      <h2 className={styles.title} style={{ fontSize: '1.05rem' }}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account</th>
              <th className={styles.right}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.accountId}>
                <td>{r.accountCode}</td>
                <td>{r.accountName}</td>
                <td className={`${styles.right} ${styles.number}`}>{formatMoney(r.amount)}</td>
              </tr>
            ))}
            <tr className={styles.subTotalRow}>
              <td colSpan={2}>Subtotal</td>
              <td className={`${styles.right} ${styles.number}`}>{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
