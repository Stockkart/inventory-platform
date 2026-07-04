import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  JournalEntryResponse,
  TrialBalanceResponse,
} from '@inventory-platform/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { ACCOUNT_CODES } from '../model/accountingConstants';
import { JOURNAL_TEMPLATES } from '../model/journalTemplates';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

const CODES = ACCOUNT_CODES;

function pickBalance(tb: TrialBalanceResponse | null, code: string): number {
  if (!tb) return 0;
  const row = tb.rows.find((r) => r.accountCode === code);
  if (!row) return 0;
  return row.normalBalance === 'DEBIT'
    ? row.debitBalance - row.creditBalance
    : row.creditBalance - row.debitBalance;
}

export function AccountingOverviewPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [tb, setTb] = useState<TrialBalanceResponse | null>(null);
  const [recent, setRecent] = useState<JournalEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposting, setReposting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tbRes, journals] = await Promise.all([
        accountingApi.trialBalance(),
        accountingApi.journals({ page: 0, size: 10 }),
      ]);
      setTb(tbRes);
      setRecent(journals.entries);
    } catch (e) {
      notifyError(
        e instanceof Error ? e.message : 'Failed to load accounting overview'
      );
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tbRes, journals] = await Promise.all([
          accountingApi.trialBalance(),
          accountingApi.journals({ page: 0, size: 10 }),
        ]);
        if (cancelled) return;
        setTb(tbRes);
        setRecent(journals.entries);
      } catch (e) {
        if (!cancelled) {
          notifyError(
            e instanceof Error ? e.message : 'Failed to load accounting overview'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  // Re-posts every vendor purchase invoice through the current accounting logic.
  // Use after changing shop-level settings (GST percentages, payment routing, CoA tweaks)
  // so historical entries reflect the new configuration instead of staying frozen at the
  // values that were live when each invoice was first posted.
  const handleRebuild = useCallback(async () => {
    const ok = window.confirm(
      'Re-post every vendor purchase invoice using the current shop settings (GST %, payment routing, CoA)?\n\nExisting journal entries for those invoices will be deleted and replaced. This cannot be undone.'
    );
    if (!ok) return;
    setReposting(true);
    try {
      const res = await accountingApi.backfill({ force: true });
      notifySuccess(
        `Re-posted ${res.reposted}, newly posted ${res.posted}, skipped ${res.skipped}, failed ${res.failed}.`
      );
      await load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to rebuild books');
    } finally {
      setReposting(false);
    }
  }, [load, notifyError, notifySuccess]);

  const cash = useMemo(() => pickBalance(tb, CODES.CASH), [tb]);
  const bank = useMemo(() => pickBalance(tb, CODES.BANK), [tb]);
  const debtors = useMemo(() => pickBalance(tb, CODES.SUNDRY_DEBTORS), [tb]);
  const creditors = useMemo(() => pickBalance(tb, CODES.SUNDRY_CREDITORS), [tb]);
  const inventory = useMemo(() => pickBalance(tb, CODES.INVENTORY), [tb]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Accounting</h1>
            <p className={styles.subtitle}>
              Every business event is recorded as a balanced journal entry. Browse the journal,
              drill into per-account ledgers, and view the trial balance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleRebuild}
              disabled={reposting}
              title="Re-post every vendor purchase invoice using current shop settings (GST %, payment routing, etc.)"
            >
              {reposting ? 'Rebuilding…' : 'Rebuild Books'}
            </button>
            <Link
              to="/dashboard/accounting/journal/new"
              className={styles.btnPrimary}
              style={{ textDecoration: 'none' }}
            >
              + Manual Entry
            </Link>
          </div>
        </div>
        <AccountingTabs />
      </div>

      <div className={styles.kpiRow}>
        <KpiCard label="Cash in Hand" value={cash} loading={loading} />
        <KpiCard label="Bank" value={bank} loading={loading} />
        <KpiCard label="Inventory (Cost)" value={inventory} loading={loading} />
        <KpiCard
          label="Receivable (Customers)"
          value={debtors}
          tone="positive"
          loading={loading}
        />
        <KpiCard
          label="Payable (Vendors)"
          value={creditors}
          tone="warning"
          loading={loading}
        />
      </div>

      <div className={styles.card} style={{ marginTop: '0.75rem' }}>
        <h2 className={styles.title} style={{ fontSize: '1.05rem', marginBottom: '0.65rem' }}>
          Quick journal templates
        </h2>
        <div className={styles.quickActionGrid}>
          {JOURNAL_TEMPLATES.filter((t) => t.id !== 'BLANK').map((t) => (
            <Link
              key={t.id}
              to={`/dashboard/accounting/journal/new?template=${t.id.toLowerCase().replace(/_/g, '-')}`}
              className={styles.quickActionCard}
            >
              <strong>{t.label}</strong>
              <span>{t.description}</span>
            </Link>
          ))}
          <Link to="/dashboard/accounting/opening-balances" className={styles.quickActionCard}>
            <strong>Opening balances</strong>
            <span>One-time wizard for starting balances</span>
          </Link>
          <Link
            to="/dashboard/accounting/reports/profit-and-loss"
            className={styles.quickActionCard}
          >
            <strong>Profit & Loss</strong>
            <span>Revenue and expenses for a period</span>
          </Link>
          <Link
            to="/dashboard/accounting/reports/balance-sheet"
            className={styles.quickActionCard}
          >
            <strong>Balance sheet</strong>
            <span>Assets, liabilities, and equity</span>
          </Link>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title} style={{ fontSize: '1.05rem' }}>
            Recent Journal Entries
          </h2>
          <Link to="/dashboard/accounting/journal" className={styles.tabLink}>
            View all
          </Link>
        </div>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : recent.length === 0 ? (
          <p className={styles.empty}>
            No journal entries yet. Register a stock purchase or post a manual entry to get started.
          </p>
        ) : (
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
              {recent.map((e) => (
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
                  <td>{renderStatus(e.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function renderStatus(status: JournalEntryResponse['status']) {
  const map: Record<JournalEntryResponse['status'], string> = {
    POSTED: styles.statusPosted,
    REVERSED: styles.statusReversed,
    VOID: styles.statusVoid,
  };
  return (
    <span className={`${styles.statusPill} ${map[status] ?? ''}`}>{status}</span>
  );
}

function KpiCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number;
  loading: boolean;
  tone?: 'positive' | 'warning';
}) {
  const color =
    tone === 'positive'
      ? '#047857'
      : tone === 'warning'
        ? '#b45309'
        : 'var(--text-primary, #0f172a)';
  return (
    <div className={styles.kpiCard}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue} style={{ color }}>
        {loading ? '…' : `₹ ${formatMoney(value)}`}
      </p>
    </div>
  );
}
