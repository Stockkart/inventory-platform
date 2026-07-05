import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { AccountResponse, AccountType, LedgerPageResponse, TrialBalanceRow } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

const TYPE_ORDER: AccountType[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
];

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

type BalanceMap = Map<string, TrialBalanceRow>;

function netBalance(row: TrialBalanceRow | undefined): number {
  if (!row) return 0;
  if (row.normalBalance === 'DEBIT') return row.debitBalance - row.creditBalance;
  return row.creditBalance - row.debitBalance;
}

export function LedgerPage() {
  const navigate = useNavigate();
  const params = useParams();
  const accountId = params.accountId ?? '';
  const { error: notifyError } = useNotify;

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [balances, setBalances] = useState<BalanceMap>(new Map());
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LedgerPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      try {
        const [rows, tb] = await Promise.all([
          accountingApi.accounts(),
          accountingApi.trialBalance().catch(() => ({ rows: [] as TrialBalanceRow[] })),
        ]);
        if (cancelled) return;
        setAccounts(rows);
        const map: BalanceMap = new Map();
        for (const r of tb.rows ?? []) map.set(r.accountId, r);
        setBalances(map);
        if (!accountId && rows.length > 0) {
          const firstWithActivity = rows.find((a) => {
            const bal = map.get(a.id);
            return bal && (bal.debitTurnover > 0 || bal.creditTurnover > 0);
          });
          const target = firstWithActivity ?? rows[0];
          navigate(`/dashboard/accounting/ledger/${target.id}`, { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load accounts');
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, navigate, notifyError]);

  const reload = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await accountingApi.ledger(accountId, {
        from: from || undefined,
        to: to || undefined,
        page,
        size: 50,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to, page, notifyError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? accounts.filter(
          (a) =>
            a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
        )
      : accounts;
    const byType: Record<AccountType, AccountResponse[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    for (const a of filtered) byType[a.type].push(a);
    for (const t of TYPE_ORDER) {
      byType[t].sort((x, y) => x.code.localeCompare(y.code));
    }
    return byType;
  }, [accounts, search]);

  function openAccount(nextId: string) {
    setPage(0);
    navigate(`/dashboard/accounting/ledger/${nextId}`);
  }

  const selected = data?.account;
  const selectedBalance = selected ? balances.get(selected.id) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Ledger</h1>
            <p className={styles.subtitle}>
              Every account in your books. Pick one to see its postings with a
              running balance on its normal side.
            </p>
          </div>
        </div>
        <AccountingTabs />
      </div>

      <div className={styles.ledgerLayout}>
        <aside className={`${styles.card} ${styles.acctList}`}>
          <input
            className={styles.acctSearch}
            type="search"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {accountsLoading ? (
            <p className={styles.acctEmpty}>Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className={styles.acctEmpty}>
              No chart of accounts found.{' '}
              <Link to="/dashboard/accounting/chart-of-accounts">Set it up</Link>.
            </p>
          ) : (
            <>
              {TYPE_ORDER.map((t) => {
                const rows = grouped[t];
                if (rows.length === 0) return null;
                return (
                  <div key={t} className={styles.acctGroup}>
                    <div className={styles.acctGroupHead}>{TYPE_LABEL[t]}</div>
                    {rows.map((a) => {
                      const bal = balances.get(a.id);
                      const net = netBalance(bal);
                      const hasActivity =
                        !!bal && (bal.debitTurnover > 0 || bal.creditTurnover > 0);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={
                            a.id === accountId
                              ? styles.acctItemActive
                              : styles.acctItem
                          }
                          onClick={() => openAccount(a.id)}
                        >
                          <span className={styles.acctItemName}>
                            <span className={styles.acctItemCode}>{a.code}</span>
                            <span className={styles.acctItemLabel}>{a.name}</span>
                          </span>
                          <span
                            className={`${styles.acctItemBalance} ${
                              hasActivity ? '' : styles.acctItemBalanceMuted
                            }`}
                            title={`Normal balance ${a.normalBalance}`}
                          >
                            {hasActivity ? formatMoney(net) : '—'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className={styles.acctSummary}>
                <span>{accounts.length} accounts</span>
                <Link to="/dashboard/accounting/chart-of-accounts">Manage</Link>
              </div>
            </>
          )}
        </aside>

        <section className={styles.page} style={{ gap: '1rem' }}>
          <div className={styles.card}>
            {selected ? (
              <div className={styles.header}>
                <div>
                  <h2 className={styles.title} style={{ fontSize: '1.05rem' }}>
                    {selected.code} · {selected.name}
                  </h2>
                  <p className={styles.subtitle}>
                    {TYPE_LABEL[selected.type]} · Normal balance{' '}
                    {selected.normalBalance}
                    {selectedBalance
                      ? ` · Closing ${formatMoney(netBalance(selectedBalance))}`
                      : ''}
                  </p>
                </div>
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
            ) : (
              <p className={styles.empty}>
                Pick an account from the list to view its ledger.
              </p>
            )}
          </div>

          {selected && (
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
                        <th>Source</th>
                        <th>Party</th>
                        <th>Narration</th>
                        <th className={styles.right}>Debit</th>
                        <th className={styles.right}>Credit</th>
                        <th className={styles.right}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.entries ?? []).map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.txnDate)}</td>
                          <td>
                            <Link
                              to={`/dashboard/accounting/journal/${row.journalEntryId}`}
                            >
                              {row.journalEntryNo}
                            </Link>
                          </td>
                          <td>
                            <span className={styles.sourcePill}>
                              {row.sourceType}
                            </span>
                          </td>
                          <td className={styles.muted}>
                            {row.partyType
                              ? `${row.partyType}${
                                  row.partyDisplayName
                                    ? ` · ${row.partyDisplayName}`
                                    : ''
                                }`
                              : '—'}
                          </td>
                          <td className={styles.muted}>{row.narration ?? '—'}</td>
                          <td className={`${styles.right} ${styles.number}`}>
                            {row.debit ? formatMoney(row.debit) : ''}
                          </td>
                          <td className={`${styles.right} ${styles.number}`}>
                            {row.credit ? formatMoney(row.credit) : ''}
                          </td>
                          <td className={`${styles.right} ${styles.number}`}>
                            {formatMoney(row.balanceAfter)}
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
                      Page {data ? data.page + 1 : 1} of{' '}
                      {data?.totalPages || 1} · {data?.totalItems ?? 0} postings
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
          )}
        </section>
      </div>
    </div>
  );
}
