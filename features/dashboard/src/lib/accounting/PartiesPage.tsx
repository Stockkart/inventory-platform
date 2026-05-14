import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import { useNotify } from '@inventory-platform/store';
import type { PartySummariesResponse } from '@inventory-platform/types';
import { AccountingTabs } from './AccountingTabs';
import { formatDate, formatMoney } from './format';
import styles from './accounting.module.css';

/** Subsidiary ledgers exist for vendors and customers; SHOP entries don't get a per-party view. */
export type SubsidiaryPartyType = 'VENDOR' | 'CUSTOMER';

const COPY: Record<
  SubsidiaryPartyType,
  {
    title: string;
    subtitle: string;
    balanceCol: string;
    netLabel: string;
    emptyLabel: string;
  }
> = {
  VENDOR: {
    title: 'Vendors',
    subtitle:
      'Subsidiary ledger of Sundry Creditors. Each row is one supplier; the balance is what you owe them as of today.',
    balanceCol: 'Owed to vendor',
    netLabel: 'Total payable',
    emptyLabel: 'No vendor activity yet.',
  },
  CUSTOMER: {
    title: 'Customers',
    subtitle:
      'Subsidiary ledger of Sundry Debtors. Each row is one customer; the balance is what they owe you as of today.',
    balanceCol: 'Owed by customer',
    netLabel: 'Total receivable',
    emptyLabel: 'No customer activity yet.',
  },
};

export interface PartiesPageProps {
  partyType: SubsidiaryPartyType;
}

export function PartiesPage({ partyType }: PartiesPageProps) {
  const copy = COPY[partyType];
  const { error: notifyError } = useNotify;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<PartySummariesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingApi.parties({
        type: partyType,
        from: from || undefined,
        to: to || undefined,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [partyType, from, to, notifyError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const rows = data?.parties ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        (p.partyDisplayName ?? '').toLowerCase().includes(q) ||
        p.partyRefId.toLowerCase().includes(q)
    );
  }, [data, search]);

  const partyHref = (refId: string) =>
    `/dashboard/accounting/${partyType.toLowerCase()}s/${encodeURIComponent(refId)}`;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.subtitle}>{copy.subtitle}</p>
          </div>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <input
            className={styles.acctSearch}
            style={{ minWidth: '18rem', marginBottom: 0 }}
            type="search"
            placeholder={`Search ${partyType === 'VENDOR' ? 'vendors' : 'customers'}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className={styles.muted}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <label className={styles.muted}>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button
            className={styles.btnGhost}
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            disabled={!from && !to}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>{copy.netLabel}</p>
          <p className={styles.kpiValue}>
            {formatMoney(data?.totalBalance ?? 0)}
          </p>
          <p className={styles.kpiHint}>
            Total debit {formatMoney(data?.totalDebit ?? 0)} · Total credit{' '}
            {formatMoney(data?.totalCredit ?? 0)}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Active parties</p>
          <p className={styles.kpiValue}>{data?.parties.length ?? 0}</p>
          <p className={styles.kpiHint}>
            {filtered.length === (data?.parties.length ?? 0)
              ? 'All shown'
              : `${filtered.length} match search`}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>
            {(data?.parties.length ?? 0) === 0
              ? copy.emptyLabel
              : 'No parties match the search.'}
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{partyType === 'VENDOR' ? 'Vendor' : 'Customer'}</th>
                <th className={styles.right}>Debit</th>
                <th className={styles.right}>Credit</th>
                <th className={styles.right}>{copy.balanceCol}</th>
                <th>Last activity</th>
                <th className={styles.right}>Txns</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.partyRefId}>
                  <td>
                    <Link to={partyHref(p.partyRefId)}>
                      {p.partyDisplayName || `Party ${p.partyRefId}`}
                    </Link>
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {p.debitTurnover ? formatMoney(p.debitTurnover) : ''}
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {p.creditTurnover ? formatMoney(p.creditTurnover) : ''}
                  </td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {formatMoney(p.balance)}
                  </td>
                  <td className={styles.muted}>{formatDate(p.lastTxnDate)}</td>
                  <td className={`${styles.right} ${styles.number}`}>
                    {p.txnCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function VendorsPage() {
  return <PartiesPage partyType="VENDOR" />;
}

export function CustomersPage() {
  return <PartiesPage partyType="CUSTOMER" />;
}
