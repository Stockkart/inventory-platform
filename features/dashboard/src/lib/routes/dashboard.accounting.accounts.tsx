import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { accountingApi } from '@inventory-platform/api';
import type {
  GlAccountResponse,
  GlAccountType,
} from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import {
  isVendorPayableNominalCode,
  nominalCodeLabelForUi,
} from '../accountingNominalUi';
import styles from './dashboard.accounting.module.css';

export function meta() {
  return [
    { title: 'Chart of accounts - StockKart' },
    { name: 'description', content: 'General ledger accounts for this shop' },
  ];
}

const ACCOUNT_TYPES: { value: GlAccountType; label: string }[] = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

function formatChartDc(raw: number | undefined, side: 'debit' | 'credit'): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n) || n <= 0) {
    return '—';
  }
  const amt = formatMoney(n);
  return side === 'debit' ? `₹${amt} Dr` : `₹${amt} Cr`;
}

function formatChartNet(net: number): string {
  if (!Number.isFinite(net) || net === 0) {
    return '—';
  }
  if (net > 0) {
    return `₹${formatMoney(net)} Dr`;
  }
  return `₹${formatMoney(Math.abs(net))} Cr`;
}

function compareByCode(a: GlAccountResponse, b: GlAccountResponse) {
  const la = nominalCodeLabelForUi(a.code, a.name);
  const lb = nominalCodeLabelForUi(b.code, b.name);
  const byLabel = la.localeCompare(lb, undefined, { numeric: true, sensitivity: 'base' });
  if (byLabel !== 0) return byLabel;
  return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
}

function netDrCr(a: GlAccountResponse): number {
  const d = Number(a.totalDebit ?? 0);
  const c = Number(a.totalCredit ?? 0);
  return d - c;
}

export default function AccountingAccountsPage() {
  const { success: notifySuccess, error: notifyError } = useNotify;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GlAccountResponse[]>([]);
  const bootstrapped = useRef(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<GlAccountType>('EXPENSE');
  const [newActive, setNewActive] = useState(true);

  const sorted = useMemo(() => [...rows].sort(compareByCode), [rows]);

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!bootstrapped.current) {
        await accountingApi.bootstrapChart();
        bootstrapped.current = true;
      }
      const list = await accountingApi.glAccounts();
      setRows(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load GL accounts';
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useNotify exposes stable notifier fns
  }, []);

  useEffect(() => {
    void loadChart();
  }, [loadChart]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) {
      notifyError('Code and display name are required');
      return;
    }
    setSubmitting(true);
    try {
      await accountingApi.createGlAccount({
        code,
        name,
        accountType: newType,
        active: newActive,
      });
      notifySuccess('Account added');
      setNewCode('');
      setNewName('');
      setNewType('EXPENSE');
      setNewActive(true);
      await loadChart();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create account';
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <p className={styles.accountsIntro}>
        Built-in accounts (cash, sales, GST, …) are created automatically. Totals below are posted
        debits and credits per account (same scope as trial balance). For extra accounts pick your
        own codes (for example BANK-HDFC); built-in codes like CASH or SALES are reserved.
      </p>

      <section className={styles.accountsAddCard} aria-labelledby="add-account-heading">
        <h2 id="add-account-heading" className={styles.accountsAddTitle}>
          Add account
        </h2>
        <form className={styles.accountsForm} onSubmit={handleCreateAccount}>
          <div className={styles.accountsField}>
            <label htmlFor="gl-code">Code</label>
            <input
              id="gl-code"
              name="code"
              autoComplete="off"
              placeholder="e.g. BANK-HDFC (not CASH / SALES / …)"
              value={newCode}
              onChange={(ev) => setNewCode(ev.target.value)}
              maxLength={64}
            />
          </div>
          <div className={`${styles.accountsField}`} style={{ flex: '1 1 12rem' }}>
            <label htmlFor="gl-name">Display name</label>
            <input
              id="gl-name"
              name="name"
              placeholder="e.g. HDFC current account"
              value={newName}
              onChange={(ev) => setNewName(ev.target.value)}
              maxLength={200}
            />
          </div>
          <div className={styles.accountsField}>
            <label htmlFor="gl-type">Type</label>
            <select
              id="gl-type"
              value={newType}
              onChange={(ev) => setNewType(ev.target.value as GlAccountType)}
            >
              {ACCOUNT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <label className={`${styles.accountsField} ${styles.accountsFieldCheckbox}`}>
            <input
              type="checkbox"
              checked={newActive}
              onChange={(ev) => setNewActive(ev.target.checked)}
            />
            <span>Active</span>
          </label>
          <button
            type="submit"
            className={styles.accountsSubmit}
            disabled={submitting || loading}
          >
            {submitting ? 'Saving…' : 'Create'}
          </button>
        </form>
        <p className={styles.accountsHint}>
          Codes are stored in uppercase. Allowed: letters, digits, <code className={styles.mono}>.</code>,{' '}
          <code className={styles.mono}>_</code>, <code className={styles.mono}>-</code> (2–64
          characters). Use the API{' '}
          <code className={styles.mono}>/accounting/journals/manual</code>
          {' '}for postings once the account exists.
        </p>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : !sorted.length ? (
        <div className={styles.card}>
          <p className={styles.empty} style={{ margin: 0, padding: '1.25rem' }}>
            No chart rows yet — bootstrap will run automatically.
          </p>
        </div>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardHeading}>
            Accounts <span className={styles.muted}>({sorted.length})</span>
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>System</th>
                  <th>Active</th>
                  <th style={{ textAlign: 'right' }}>Debits</th>
                  <th style={{ textAlign: 'right' }}>Credits</th>
                  <th style={{ textAlign: 'right' }} title="Debit minus credit">
                    Net (Dr−Cr)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => {
                  const net = netDrCr(a);
                  return (
                  <tr key={a.id}>
                    <td
                      className={isVendorPayableNominalCode(a.code) ? undefined : styles.mono}
                    >
                      {nominalCodeLabelForUi(a.code, a.name)}
                    </td>
                    <td>{a.name}</td>
                      <td className={styles.mono}>{a.accountType}</td>
                      <td>{a.systemAccount ? 'Yes' : '—'}</td>
                      <td>{a.active ? 'Yes' : 'No'}</td>
                      <td className={styles.mono} style={{ textAlign: 'right' }}>
                        {formatChartDc(a.totalDebit, 'debit')}
                      </td>
                      <td className={styles.mono} style={{ textAlign: 'right' }}>
                        {formatChartDc(a.totalCredit, 'credit')}
                      </td>
                      <td className={styles.mono} style={{ textAlign: 'right' }}>
                        {formatChartNet(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
