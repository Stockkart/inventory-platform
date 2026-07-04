import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { AccountResponse, JournalEntryResponse } from '@inventory-platform/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { JournalEntryEditor } from '../ui/JournalEntryEditor';
import { emptyLine } from '../model/journalEntryFormUtils';
import { todayLocalDate, formatDate } from '../model/format';
import styles from '../ui/accounting.module.css';

export function OpeningBalanceWizardPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [existing, setExisting] = useState<JournalEntryResponse | null | undefined>(undefined);
  const [txnDate, setTxnDate] = useState(todayLocalDate());
  const [narration, setNarration] = useState('Opening balances');
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      try {
        const [rows, status] = await Promise.all([
          accountingApi.accounts(),
          accountingApi.openingBalanceStatus(),
        ]);
        if (!cancelled) {
          setAccounts(rows);
          setExisting(status);
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load opening balance data');
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const locked = Boolean(existing);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Opening Balances</h1>
            <p className={styles.subtitle}>
              One-time entry to bring forward balances when you start using accounting. Debits must
              equal credits.
            </p>
          </div>
        </div>
        <AccountingTabs />
      </div>

      {existing ? (
        <div className={styles.card}>
          <p className={styles.muted}>
            Opening balances were already posted on {formatDate(existing.txnDate)} as{' '}
            <Link to={`/dashboard/accounting/journal/${existing.id}`}>{existing.entryNo}</Link>.
          </p>
          <p className={styles.muted} style={{ marginTop: '0.5rem' }}>
            To change opening balances you must reverse that entry and post a new one (contact support
            if you need help).
          </p>
        </div>
      ) : null}

      <div className={styles.card}>
        <JournalEntryEditor
          accounts={accounts}
          accountsLoading={accountsLoading}
          txnDate={txnDate}
          onTxnDateChange={setTxnDate}
          narration={narration}
          onNarrationChange={setNarration}
          lines={lines}
          onLinesChange={setLines}
          showTemplates={false}
          submitLabel="Post Opening Balances"
          submitting={submitting}
          disabled={locked}
          onValidationError={notifyError}
          onSubmit={async (body) => {
            setSubmitting(true);
            try {
              const posted = await accountingApi.postOpeningBalance(body);
              notifySuccess(`Opening balances posted as ${posted.entryNo}`);
              navigate(`/dashboard/accounting/journal/${posted.id}`);
            } catch (e) {
              notifyError(e instanceof Error ? e.message : 'Failed to post opening balances');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </div>
    </div>
  );
}
