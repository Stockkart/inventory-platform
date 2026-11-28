import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
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
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  useAdjustWalletMutation,
  useAdminWalletQuery,
  useWalletAdjustmentPreviewQuery,
} from '../hooks';
import { ReasonDialog } from '../ReasonDialog';
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

interface AdjustFormProps {
  shopId: string;
}

function AdjustForm({ shopId }: AdjustFormProps) {
  const [amountInput, setAmountInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  /** Kept across retries of one adjustment so a resend is not applied twice. */
  const [adjustmentId, setAdjustmentId] = useState(newAdjustmentId);
  const mutation = useAdjustWalletMutation(shopId);
  const amount = parseAdjustmentAmount(amountInput);
  const preview = useWalletAdjustmentPreviewQuery(shopId, amount, confirming);
  const credit = amount !== null && amount > 0;

  const confirm = (reason: string) => {
    if (amount === null) return;
    mutation.mutate(
      { amount, reason, adjustmentId },
      {
        onSuccess: () => {
          useNotify.success(credit ? 'Wallet credited' : 'Wallet debited');
          setConfirming(false);
          setAmountInput('');
          setAdjustmentId(newAdjustmentId());
        },
      },
    );
  };

  let previewBody: ReactNode = <CenteredLoader label="Checking the new balance…" />;
  if (preview.isError) {
    previewBody = (
      <Alert variant="danger">
        {adminErrorMessage(preview.error, 'Could not check this adjustment.')}
      </Alert>
    );
  } else if (preview.data) {
    previewBody = preview.data.allowed ? (
      <Text>
        Balance {formatRupees(preview.data.currentBalance)} →{' '}
        <Text as="span" weight="semibold">
          {formatRupees(preview.data.resultingBalance)}
        </Text>
      </Text>
    ) : (
      <Alert variant="warning">
        The API does not allow this adjustment. One adjustment can move at most{' '}
        {formatRupees(preview.data.maxAdjustment)} either way; the balance is{' '}
        {formatRupees(preview.data.currentBalance)}.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Text variant="heading3" weight="semibold">
        Adjust balance
      </Text>
      <FormField
        label="Amount (₹)"
        htmlFor="wallet-adjust-amount"
        required
        hint="Positive to credit, negative (e.g. -250) to debit. You confirm the new balance next."
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
      <Inline>
        <Button variant="solid" disabled={amount === null} onClick={() => setConfirming(true)}>
          {amount !== null && amount < 0 ? 'Review debit' : 'Review credit'}
        </Button>
      </Inline>
      <ReasonDialog
        open={confirming}
        title={credit ? 'Credit this wallet?' : 'Debit this wallet?'}
        message={`Shop ${shopId}: ${credit ? 'credit' : 'debit'} ${formatRupees(
          Math.abs(amount ?? 0),
        )}.`}
        confirmLabel={credit ? 'Credit wallet' : 'Debit wallet'}
        confirmDisabled={!preview.data?.allowed}
        busy={mutation.isPending}
        error={mutation.error ? adminErrorMessage(mutation.error) : null}
        onConfirm={confirm}
        onClose={() => {
          setConfirming(false);
          mutation.reset();
        }}
      >
        {previewBody}
      </ReasonDialog>
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
