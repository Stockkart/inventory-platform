import { useEffect, useMemo, useState } from 'react';
import type { CreateCreditEntryDto } from '@inventory-platform/credit/types';
import {
  Box,
  Card,
  CardBody,
  CenteredLoader,
  PageHeader,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
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

const BALANCE_EPS = 0.0001;

const creditGridStyle = {
  gridTemplateColumns: 'minmax(0, 20rem) 1fr',
  gap: '1rem',
  alignItems: 'start',
} as const;

export function CreditPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: accountsRaw = [], isLoading, isError, error } = useCreditAccountsQuery();

  const accounts = useMemo(() => [...accountsRaw].sort(accountSort), [accountsRaw]);

  const pendingAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance > BALANCE_EPS).sort(accountSort),
    [accounts],
  );

  const favourAccounts = useMemo(
    () => accounts.filter((a) => a.currentBalance < -BALANCE_EPS).sort(accountSort),
    [accounts],
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
    const nextId = pendingAccounts[0]?.id ?? favourAccounts[0]?.id ?? accounts[0]?.id ?? null;
    setSelectedId(nextId);
  }, [accounts, pendingAccounts, favourAccounts, selectedId]);

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId],
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
    <Stack gap="md">
      <PageHeader description="Track amounts due and settlements with customers and vendors" />

      {isLoading ? (
        <Card>
          <CardBody>
            <CenteredLoader label="Loading credit accounts…" />
          </CardBody>
        </Card>
      ) : (
        <Box display="grid" style={creditGridStyle}>
          <Card>
            <CardBody className={surfaceChrome.creditSidebarBody}>
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
                    ? 'Nothing due right now. See “In your favour” below.'
                    : 'No outstanding dues right now.'
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              {!accounts.length ? (
                <Stack gap="md">
                  <Text variant="title" weight="semibold">
                    Get started
                  </Text>
                  <CreditManualChargeForm
                    submitting={submitting}
                    onSubmit={(b) => submit('charge', b)}
                  />
                </Stack>
              ) : selected ? (
                <Stack gap="md">
                  <Text variant="title" weight="semibold">
                    Record activity
                  </Text>
                  <CreditPartyActions
                    account={selected}
                    submitting={submitting}
                    onSubmitCharge={(b) => submit('charge', b)}
                    onSubmitSettlement={(b) => submit('settlement', b)}
                  />
                  <Text variant="heading3" weight="semibold">
                    Ledger timeline
                  </Text>
                  <CreditEntriesTimeline entries={entries} partyType={selected.partyType} />
                </Stack>
              ) : (
                <Text color="secondary">
                  Search the sidebar for a party to view their history, or add an outstanding charge
                  to see them under Due now.
                </Text>
              )}
            </CardBody>
          </Card>
        </Box>
      )}
    </Stack>
  );
}
