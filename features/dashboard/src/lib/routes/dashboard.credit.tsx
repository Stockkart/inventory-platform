import { useEffect, useMemo, useState } from 'react';
import { creditApi } from '@inventory-platform/api';
import type { CreditAccountResponse, CreditEntryResponse, CreateCreditEntryDto } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import { CreditPartiesSidebar } from '../credit/CreditPartiesSidebar';
import { CreditEntriesTimeline } from '../credit/CreditEntriesTimeline';
import { CreditManualChargeForm } from '../credit/CreditManualChargeForm';
import { CreditPartyActions } from '../credit/CreditPartyActions';
import { accountSort } from '../credit/credit-utils';
import styles from '../credit/credit.module.css';

export function meta() {
  return [
    { title: 'Credit balances - StockKart' },
    { name: 'description', content: 'Outstanding customer and vendor balances' },
  ];
}

export default function CreditPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<CreditAccountResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<CreditEntryResponse[]>([]);

  const selected = useMemo(() => accounts.find((a) => a.id === selectedId) ?? null, [accounts, selectedId]);

  const BALANCE_EPS = 0.0001;

  const pendingAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance > BALANCE_EPS).sort(accountSort),
    [accounts]
  );

  /** Vendor credit / customer advance — balance went negative after returns or over-payment. */
  const favourAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance < -BALANCE_EPS).sort(accountSort),
    [accounts]
  );

  async function refreshAccounts(preferredId?: string | null) {
    const rows = (await creditApi.accounts()).sort(accountSort);
    setAccounts(rows);
    const pending = rows.filter((a) => a.currentBalance > BALANCE_EPS);
    const inFavour = rows.filter((a) => a.currentBalance < -BALANCE_EPS);
    const nextId =
      preferredId && rows.some((r) => r.id === preferredId)
        ? preferredId
        : pending[0]?.id ?? inFavour[0]?.id ?? rows[0]?.id ?? null;
    setSelectedId(nextId);
    return nextId;
  }

  async function refreshEntries(accountId: string | null) {
    if (!accountId) {
      setEntries([]);
      return;
    }
    const page = await creditApi.entries(accountId, 0, 30);
    setEntries(page.entries ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const id = await refreshAccounts(null);
        if (!cancelled) await refreshEntries(id);
      } catch (e) {
        if (!cancelled) notifyError(e instanceof Error ? e.message : 'Failed to load credit balances');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  useEffect(() => {
    void refreshEntries(selectedId);
  }, [selectedId]);

  async function submit(kind: 'charge' | 'settlement', body: CreateCreditEntryDto) {
    setSubmitting(true);
    try {
      await (kind === 'charge' ? creditApi.charge(body) : creditApi.settlement(body));
      notifySuccess(kind === 'charge' ? 'Charge added' : 'Settlement posted');
      const id = await refreshAccounts(selectedId);
      await refreshEntries(id);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to save credit entry');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Credit balances</h1>
      </div>

      {loading ? (
        <div className={styles.card}><p className={styles.empty}>Loading...</p></div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <CreditPartiesSidebar
              allAccounts={accounts}
              pendingAccounts={pendingAccounts}
              favourAccounts={favourAccounts}
              selectedId={selectedId}
              onSelect={setSelectedId}
              pendingListEmptyMessage={
                accounts.length === 0
                  ? 'No credit accounts yet. Add a charge or settlement first.'
                  : favourAccounts.length > 0
                    ? 'No amounts due right now. See “In your favour” below (e.g. supplier credit from returns).'
                    : 'No outstanding dues right now.'
              }
            />
          </section>

          <section className={styles.card}>
            {!accounts.length ? (
              <>
                <h2 className={styles.detailTitle}>Get started</h2>
                <CreditManualChargeForm submitting={submitting} onSubmit={(b) => submit('charge', b)} />
              </>
            ) : selected ? (
              <>
                <h2 className={styles.detailTitle}>Record activity</h2>
                <CreditPartyActions
                  account={selected}
                  submitting={submitting}
                  onSubmitCharge={(b) => submit('charge', b)}
                  onSubmitSettlement={(b) => submit('settlement', b)}
                />
                <h3 className={styles.timelineTitle}>Ledger timeline</h3>
                <CreditEntriesTimeline
                  entries={entries}
                  partyType={selected.partyType}
                />
              </>
            ) : (
              <p className={styles.empty}>
                Search the sidebar for a party to view their history, or add an outstanding charge to
                see them under Due now.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
