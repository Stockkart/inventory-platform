import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { useAdjustWalletMutation, useAdminWalletQuery } from '../hooks';
import {
  adminErrorMessage,
  formatAdminDate,
  newAdjustmentId,
  parseAdjustmentAmount,
} from '../format';
import { walletSourceLabel } from '../../referrals';
import { formatRupees } from '../../ui/planPricing';

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="title" weight="bold">
        {value}
      </Text>
    </Stack>
  );
}

function AdjustForm({ shopId }: { shopId: string }) {
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  /** Kept across retries of one adjustment so a resend is not applied twice. */
  const [adjustmentId, setAdjustmentId] = useState(newAdjustmentId);
  const mutation = useAdjustWalletMutation(shopId);
  const amount = parseAdjustmentAmount(amountInput);
  const canSubmit = amount !== null && reason.trim().length > 0 && !mutation.isPending;

  const submit = () => {
    if (amount === null) return;
    mutation.mutate(
      { amount, reason: reason.trim(), adjustmentId },
      {
        onSuccess: () => {
          useNotify.success(amount > 0 ? 'Wallet credited' : 'Wallet debited');
          setAmountInput('');
          setReason('');
          setAdjustmentId(newAdjustmentId());
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Text variant="heading3" weight="semibold">
        Adjust balance
      </Text>
      {mutation.error ? <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert> : null}
      <FormField
        label="Amount (₹)"
        htmlFor="wallet-adjust-amount"
        required
        hint="Positive to credit, negative (e.g. -250) to debit. A debit can only take what is available."
        error={
          amountInput && amount === null ? 'Enter a non-zero amount, up to 2 decimals.' : undefined
        }
      >
        <Input
          id="wallet-adjust-amount"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => {
            setAmountInput(e.target.value);
            setAdjustmentId(newAdjustmentId());
          }}
          disabled={mutation.isPending}
        />
      </FormField>
      <FormField
        label="Reason"
        htmlFor="wallet-adjust-reason"
        required
        hint="Shown on the ledger and kept in the audit log."
      >
        <Textarea
          id="wallet-adjust-reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={mutation.isPending}
        />
      </FormField>
      <Inline>
        <Button variant="solid" disabled={!canSubmit} loading={mutation.isPending} onClick={submit}>
          {amount !== null && amount < 0 ? 'Debit wallet' : 'Credit wallet'}
        </Button>
      </Inline>
    </Stack>
  );
}

export function WalletPanel() {
  const [shopInput, setShopInput] = useState('');
  const [shopId, setShopId] = useState<string | null>(null);
  const query = useAdminWalletQuery(shopId);
  const wallet = query.data;

  return (
    <Stack gap="md">
      <Inline gap="md" align="end">
        <FormField label="Shop ID" htmlFor="wallet-shop-id">
          <Input
            id="wallet-shop-id"
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && shopInput.trim()) setShopId(shopInput.trim());
            }}
          />
        </FormField>
        <Button
          variant="solid"
          disabled={!shopInput.trim()}
          onClick={() => setShopId(shopInput.trim())}
        >
          Look up
        </Button>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">
          {adminErrorMessage(query.error, 'Could not load that wallet.')}
        </Alert>
      ) : null}

      {wallet && shopId ? (
        <>
          <Card>
            <CardBody>
              <Stack gap="md">
                <Inline gap="lg" flexWrap>
                  <Figure label="Available" value={formatRupees(wallet.availableBalance)} />
                  <Figure label="Held for checkout" value={formatRupees(wallet.reservedBalance)} />
                  <Figure label="Owed back" value={formatRupees(wallet.outstandingClawback)} />
                </Inline>
                <AdjustForm key={shopId} shopId={shopId} />
              </Stack>
            </CardBody>
          </Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Activity</TableHeaderCell>
                <TableHeaderCell>Note</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Balance</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wallet.entries.length === 0 ? (
                <TableEmptyRow colSpan={5} message="No wallet activity." />
              ) : (
                wallet.entries.map((entry) => (
                  <TableRow key={`${entry.source}-${entry.sourceId}-${entry.createdAt}`}>
                    <TableCell>{formatAdminDate(entry.createdAt)}</TableCell>
                    <TableCell>{walletSourceLabel(entry.source)}</TableCell>
                    <TableCell>{entry.note ?? '—'}</TableCell>
                    <TableCell>
                      {entry.availableDelta >= 0 ? '+' : '−'}
                      {formatRupees(Math.abs(entry.availableDelta))}
                    </TableCell>
                    <TableCell>{formatRupees(entry.availableAfter)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      ) : null}
    </Stack>
  );
}
