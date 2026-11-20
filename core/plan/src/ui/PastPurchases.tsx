import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Inline,
  Stack,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { PlanTransactionResponse, PurchaseLine } from '../model/types';
import { formatRupees } from './planPricing';
import {
  amountLabel,
  hasPurchaseDetail,
  lineEachLabel,
  paidLabel,
  periodLabel,
  purchaseDateLabel,
  purchaseTitle,
  refundLabel,
  statusTagLabel,
} from './purchaseHistory';

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <Inline justify="between" width="full" gap="md">
      <Text variant="caption" color={tone ?? 'secondary'}>
        {label}
      </Text>
      <Text variant="caption" color={tone ?? 'secondary'}>
        {value}
      </Text>
    </Inline>
  );
}

function LineRow({ line }: { line: PurchaseLine }) {
  return (
    <Stack gap="xs">
      <Inline justify="between" width="full" gap="md">
        <Text variant="caption">
          {line.name}
          {line.quantity > 1 ? ` × ${line.quantity}` : ''}
        </Text>
        {line.unitPrice != null ? (
          <Text variant="caption">
            {line.quantity > 1 ? lineEachLabel(line) : formatRupees(line.unitPrice)}
          </Text>
        ) : null}
      </Inline>
      {line.discount != null && line.discount > 0 ? (
        <Row
          label={line.voucherCode ? `Voucher ${line.voucherCode}` : 'Discount'}
          value={`−${formatRupees(line.discount)}`}
          tone="success"
        />
      ) : null}
      {line.walletCredit != null && line.walletCredit > 0 ? (
        <Row label="Wallet credit" value={`−${formatRupees(line.walletCredit)}`} />
      ) : null}
      {line.lineTotal != null ? (
        <Row label="Line total" value={formatRupees(line.lineTotal)} />
      ) : null}
    </Stack>
  );
}

function PurchaseDetail({ tx }: { tx: PlanTransactionResponse }) {
  return (
    <Stack gap="sm">
      {(tx.items ?? []).map((line, index) => (
        <LineRow key={`${line.type}-${line.code}-${index}`} line={line} />
      ))}
      {tx.subtotal != null ? <Row label="Subtotal" value={formatRupees(tx.subtotal)} /> : null}
      {tx.discountTotal != null && tx.discountTotal > 0 ? (
        <Row label="Discount" value={`−${formatRupees(tx.discountTotal)}`} tone="success" />
      ) : null}
      {tx.walletCredit != null && tx.walletCredit > 0 ? (
        <Row label="Wallet credit" value={`−${formatRupees(tx.walletCredit)}`} />
      ) : null}
      {tx.amount != null ? (
        <Inline justify="between" width="full" gap="md">
          <Text variant="caption" weight="semibold">
            {paidLabel(tx)}
          </Text>
          <Text variant="caption" weight="semibold">
            {amountLabel(tx)}
          </Text>
        </Inline>
      ) : null}
    </Stack>
  );
}

function PurchaseRow({ tx }: { tx: PlanTransactionResponse }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const period = periodLabel(tx);
  const refund = refundLabel(tx);
  const status = statusTagLabel(tx);

  const summary = (
    <>
      <Box as="span" className={surfaceChrome.planTopUpHeading}>
        <Box as="span">
          <Text as="span" weight="semibold">
            {purchaseTitle(tx)}
          </Text>{' '}
          {status ? <Badge variant="neutral">{status}</Badge> : null}{' '}
          {refund ? <Badge variant="warning">{refund}</Badge> : null}
        </Box>
        <Text as="span" variant="caption" color="secondary">
          {purchaseDateLabel(tx.createdAt)}
          {period ? ` · ${period}` : ''}
        </Text>
      </Box>
      <Text as="span" weight="semibold">
        {amountLabel(tx)}
      </Text>
    </>
  );

  if (!hasPurchaseDetail(tx)) {
    return (
      <Box className={surfaceChrome.planTopUpToggle} style={{ display: 'flex' }}>
        {summary}
      </Box>
    );
  }

  return (
    <Stack gap="sm">
      <Button
        type="button"
        variant="ghost"
        align="start"
        fullWidth
        className={surfaceChrome.planTopUpToggle}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((value) => !value)}
      >
        {summary}
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(surfaceChrome.planTopUpChevron, open && surfaceChrome.planTopUpChevronOpen)}
        />
      </Button>
      <Box id={detailId} hidden={!open}>
        {open ? <PurchaseDetail tx={tx} /> : null}
      </Box>
    </Stack>
  );
}

/** Past purchases, newest first as the API returns them. Every figure comes from the API. */
export function PastPurchases({ transactions }: { transactions: PlanTransactionResponse[] }) {
  if (transactions.length === 0) {
    return (
      <Stack gap="sm" padding="md" align="center">
        <Text align="center" color="secondary">
          No purchases yet
        </Text>
      </Stack>
    );
  }
  return (
    <Stack gap="sm">
      {transactions.map((tx, index) => (
        <Stack key={tx.id} gap="sm">
          {index > 0 ? <Divider /> : null}
          <PurchaseRow tx={tx} />
        </Stack>
      ))}
    </Stack>
  );
}
