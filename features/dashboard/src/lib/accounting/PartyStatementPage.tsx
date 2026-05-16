import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { accountingApi } from '@inventory-platform/api';
import { useNotify } from '@inventory-platform/store';
import type { PartyStatementResponse } from '@inventory-platform/types';
import { AccountingTabs } from './AccountingTabs';
import type { SubsidiaryPartyType } from './PartiesPage';
import { formatDate, formatMoney } from './format';
import styles from './accounting.module.css';

export interface PartyStatementPageProps {
  partyType: SubsidiaryPartyType;
}

const TITLES: Record<SubsidiaryPartyType, { kind: string; back: string; backHref: string }> = {
  VENDOR: {
    kind: 'Vendor',
    back: 'All vendors',
    backHref: '/dashboard/accounting/vendors',
  },
  CUSTOMER: {
    kind: 'Customer',
    back: 'All customers',
    backHref: '/dashboard/accounting/customers',
  },
};

export function PartyStatementPage({ partyType }: PartyStatementPageProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const partyRefId = params.partyRefId ?? '';
  const titles = TITLES[partyType];

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PartyStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!partyRefId) return;
    setLoading(true);
    try {
      const res = await accountingApi.partyStatement(partyType, partyRefId, {
        from: from || undefined,
        to: to || undefined,
        page,
        size: 50,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [partyType, partyRefId, from, to, page, notifyError]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!partyRefId) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.empty}>
            No party selected.{' '}
            <Link to={titles.backHref}>Go back to {titles.back.toLowerCase()}</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {data?.partyDisplayName || `${titles.kind} ${partyRefId}`}
            </h1>
            <p className={styles.subtitle}>
              {titles.kind} statement · subsidiary view of{' '}
              {partyType === 'VENDOR' ? 'Sundry Creditors' : 'Sundry Debtors'} for this
              party.
            </p>
          </div>
          <button
            className={styles.btnGhost}
            onClick={() => navigate(titles.backHref)}
          >
            ← {titles.back}
          </button>
        </div>
        <AccountingTabs />
        <div className={styles.toolbar}>
          <label className={styles.muted}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value);
            }}
          />
          <label className={styles.muted}>To</label>
          <input
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
              setFrom('');
              setTo('');
              setPage(0);
            }}
            disabled={!from && !to}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Opening balance</p>
          <p className={styles.kpiValue}>{formatMoney(data?.openingBalance ?? 0)}</p>
          <p className={styles.kpiHint}>
            {partyType === 'VENDOR' ? 'Payable to vendor' : 'Receivable from customer'}{' '}
            before {from || 'first entry'}
          </p>
        </div>
        <div className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Closing balance</p>
          <p className={styles.kpiValue}>{formatMoney(data?.closingBalance ?? 0)}</p>
          <p className={styles.kpiHint}>
            After last shown entry · {data?.totalItems ?? 0} txn
            {(data?.totalItems ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : (data?.entries.length ?? 0) === 0 ? (
          <p className={styles.empty}>No postings in this range.</p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entry #</th>
                  <th>Account</th>
                  <th>Source</th>
                  <th>Narration</th>
                  <th className={styles.right}>Debit</th>
                  <th className={styles.right}>Credit</th>
                  <th className={styles.right}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {(data?.entries ?? []).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.txnDate)}</td>
                    <td>
                      <Link to={`/dashboard/accounting/journal/${e.journalEntryId}`}>
                        {e.journalEntryNo}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/dashboard/accounting/ledger/${e.accountId}`}>
                        {e.accountCode} · {e.accountName}
                      </Link>
                    </td>
                    <td>
                      <span className={styles.sourcePill}>{e.sourceType}</span>
                    </td>
                    <td className={styles.muted}>{e.narration ?? '—'}</td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {e.debit ? formatMoney(e.debit) : ''}
                    </td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {e.credit ? formatMoney(e.credit) : ''}
                    </td>
                    <td className={`${styles.right} ${styles.number}`}>
                      {formatMoney(e.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className={styles.toolbar}
              style={{
                justifyContent: 'space-between',
                marginTop: '0.6rem',
              }}
            >
              <span className={styles.muted}>
                Page {data ? data.page + 1 : 1} of {data?.totalPages || 1} ·{' '}
                {data?.totalItems ?? 0} postings
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
                  disabled={
                    !data || data.page + 1 >= (data?.totalPages ?? 0)
                  }
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

export function VendorStatementPage() {
  return <PartyStatementPage partyType="VENDOR" />;
}

export function CustomerStatementPage() {
  return <PartyStatementPage partyType="CUSTOMER" />;
}
