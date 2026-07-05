import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { AccountResponse, AccountType, CreateAccountRequest } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
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

export function ChartOfAccountsPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<CreateAccountRequest>({
    code: '',
    name: '',
    type: 'EXPENSE',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await accountingApi.accounts();
      setAccounts(rows);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const out: Record<AccountType, AccountResponse[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    accounts.forEach((a) => out[a.type].push(a));
    TYPE_ORDER.forEach((t) =>
      out[t].sort((a, b) => a.code.localeCompare(b.code))
    );
    return out;
  }, [accounts]);

  async function submit() {
    if (!draft.code.trim() || !draft.name.trim()) {
      notifyError('Code and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      await accountingApi.createAccount({
        code: draft.code.trim(),
        name: draft.name.trim(),
        type: draft.type,
        normalBalance: draft.normalBalance,
      });
      notifySuccess('Account created');
      setShowCreate(false);
      setDraft({ code: '', name: '', type: 'EXPENSE' });
      await refresh();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(account: AccountResponse) {
    try {
      await accountingApi.updateAccount(account.id, {
        active: !account.active,
      });
      await refresh();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to update account');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Chart of Accounts</h1>
            <p className={styles.subtitle}>
              The accounting backbone. System accounts (locked) come pre-seeded; add your own for
              custom expense or income categories.
            </p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowCreate((s) => !s)}
          >
            {showCreate ? 'Cancel' : '+ New Account'}
          </button>
        </div>
        <AccountingTabs />
      </div>

      {showCreate && (
        <div className={styles.card}>
          <h2 className={styles.title} style={{ fontSize: '1.05rem' }}>
            New Account
          </h2>
          <div className={styles.toolbar} style={{ marginTop: '0.6rem' }}>
            <input
              type="text"
              placeholder="Code (e.g. 5910)"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              style={{ width: '7rem' }}
            />
            <input
              type="text"
              placeholder="Name (e.g. Marketing Expense)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              style={{ flex: 1, minWidth: '12rem' }}
            />
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as AccountType })
              }
            >
              {TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <button
              className={styles.btnPrimary}
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Account'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : accounts.length === 0 ? (
          <p className={styles.empty}>
            No accounts yet. Open this page once to seed the default chart, or create your first
            account above.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Normal</th>
                <th>System</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {TYPE_ORDER.map((type) => {
                const rows = grouped[type];
                if (rows.length === 0) return null;
                return (
                  <RowsForType
                    key={type}
                    type={type}
                    rows={rows}
                    onToggleActive={toggleActive}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RowsForType({
  type,
  rows,
  onToggleActive,
}: {
  type: AccountType;
  rows: AccountResponse[];
  onToggleActive: (account: AccountResponse) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={7} className={styles.groupHeading}>
          {TYPE_LABEL[type]}
        </td>
      </tr>
      {rows.map((a) => (
        <tr key={a.id}>
          <td className={styles.muted}>{a.code}</td>
          <td>
            <Link to={`/dashboard/accounting/ledger/${a.id}`}>{a.name}</Link>
          </td>
          <td className={styles.muted}>{TYPE_LABEL[a.type]}</td>
          <td className={styles.muted}>{a.normalBalance}</td>
          <td>{a.system ? '🔒 System' : '—'}</td>
          <td>{a.active ? 'Yes' : 'No'}</td>
          <td>
            {!a.system && (
              <button
                className={styles.btnGhost}
                onClick={() => onToggleActive(a)}
              >
                {a.active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
