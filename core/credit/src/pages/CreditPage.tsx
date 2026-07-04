import { useEffect, useMemo, useState } from 'react';
import type { CreateCreditEntryDto } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/session';
import {
  useChargeMutation,
  useCreditAccountsQuery,
  useCreditEntriesQuery,
  useSettlementMutation,
} from '../queries/hooks';
import { accountSort } from '../model/credit-utils';
import { CreditPartiesSidebar } from '../ui/CreditPartiesSidebar';
import { CreditEntriesTimeline } from '../ui/CreditEntriesTimeline';
import { CreditManualChargeForm } from '../ui/CreditManualChargeForm';
import { CreditPartyActions } from '../ui/CreditPartyActions';
import styles from '../ui/credit.module.css';

const BALANCE_EPS = 0.0001;

export function CreditPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: accountsRaw = [],
    isLoading,
    isError,
    error,
  } = useCreditAccountsQuery();

  const accounts = useMemo(() => [...accountsRaw].sort(accountSort), [accountsRaw]);

  const pendingAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance > BALANCE_EPS).sort(accountSort),
    [accounts]
  );

  const favourAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance < -BALANCE_EPS).sort(accountSort),
    [accounts]
  );

  useEffect(() => {
    if (isError) {
      notifyError(error instanceof Error ? error.message : 'Failed to load credit balances');
    }
  }, [isError, error, notifyError]);

  useEffect(() => {
    if (!accounts.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && accounts.some((a) => a.id === selectedId)) return;
    const nextId =
      pendingAccounts[0]?.id ?? favourAccounts[0]?.id ?? accounts[0]?.id ?? null;
    setSelectedId(nextId);
  }, [accounts, pendingAccounts, favourAccounts, selectedId]);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId]
  );

  const { data: entriesPage } = useCreditEntriesQuery(selectedId, 0, 30);
  const entries = entriesPage?.entries ?? [];

  const chargeMutation = useChargeMutation({
    onSuccess: () => notifySuccess('Charge added'),
    onError: (e) => notifyError(e instanceof Error ? e.message : 'Failed to save credit entry'),
  });

  const settlementMutation = useSettlementMutation({
    onSuccess: () => notifySuccess('Settlement posted'),
    onError: (e) => notifyError(e instanceof Error ? e.message : 'Failed to save credit entry'),
  });

  const submitting = chargeMutation.isPending || settlementMutation.isPending;

  async function submit(kind: 'charge' | 'settlement', body: CreateCreditEntryDto) {
    if (kind === 'charge') {
      await chargeMutation.mutateAsync(body);
    } else {
      await settlementMutation.mutateAsync(body);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Credit balances</h1>
      </div>

      {isLoading ? (
        <div className={styles.card}>
          <p className={styles.empty}>Loading...</p>
        </div>
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
                <CreditManualChargeForm
                  submitting={submitting}
                  onSubmit={(b) => submit('charge', b)}
                />
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
                <CreditEntriesTimeline entries={entries} partyType={selected.partyType} />
              </>
            ) : (
              <p className={styles.empty}>
                Search the sidebar for a party to view their history, or add an outstanding charge
                to see them under Due now.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
