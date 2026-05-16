import { useEffect, useState } from 'react';
import { accountingApi } from '@inventory-platform/api';
import { useNotify } from '@inventory-platform/store';
import type { BalanceSheetResponse, FinancialReportLineDto } from '@inventory-platform/types';
import { AccountingTabs } from './AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from './format';
import styles from './accounting.module.css';

export function BalanceSheetPage() {
  const { error: notifyError } = useNotify;
  const [asOf, setAsOf] = useState(todayLocalDate());
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.balanceSheet(asOf || undefined);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load balance sheet');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asOf, notifyError]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Balance Sheet</h1>
            <p className={styles.subtitle}>
              Assets, liabilities, and equity as of the selected date (from trial balance).
            </p>
          </div>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <label className={styles.muted}>As of</label>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
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
              <p className={styles.kpiLabel}>Total assets</p>
              <p className={styles.kpiValue}>₹ {formatMoney(data.totalAssets)}</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Liabilities + equity</p>
              <p className={styles.kpiValue}>
                ₹ {formatMoney(data.totalLiabilitiesAndEquity)}
              </p>
            </div>
            {Math.abs(data.imbalance) > 0.01 ? (
              <div className={styles.kpiCard}>
                <p className={styles.kpiLabel}>Imbalance</p>
                <p className={styles.kpiValue} style={{ color: '#b91c1c' }}>
                  ₹ {formatMoney(data.imbalance)}
                </p>
              </div>
            ) : null}
          </div>

          <BsSection title="Assets" rows={data.assets} total={data.totalAssets} />
          <BsSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
          <BsSection title="Equity" rows={data.equity} total={data.totalEquity} />

          <p className={styles.muted} style={{ marginTop: '0.75rem' }}>
            As of {formatDate(data.asOf)}
          </p>
        </>
      )}
    </div>
  );
}

function BsSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: FinancialReportLineDto[];
  total: number;
}) {
  return (
    <div className={styles.card} style={{ marginTop: '0.75rem' }}>
      <h2 className={styles.title} style={{ fontSize: '1.05rem' }}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>No balances</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account</th>
              <th className={styles.right}>Balance</th>
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
              <td colSpan={2}>Total {title.toLowerCase()}</td>
              <td className={`${styles.right} ${styles.number}`}>{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
