import { useState } from 'react';
import type {
  CustomerProductHistoryGroup,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Inline,
  Spinner,
  Stack,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SaleEntry = NonNullable<CustomerProductHistoryGroup['lastSale']>;

function formatRate(price: number): string {
  if (!Number.isFinite(price)) return moneyFormatter.format(0);
  const isWhole = price % 1 === 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(price);
}

function formatQtyAtRate(qty: SaleEntry['quantity'], priceToRetail: number): string {
  const n = Number(qty);
  const qtyLabel = Number.isFinite(n) ? (n === 1 ? '1 pc' : `${n} pcs`) : String(qty);
  return `${qtyLabel} at ${formatRate(priceToRetail)} rate`;
}

function HistoryEntryRow({
  entry,
  variant = 'primary',
}: {
  entry: SaleEntry;
  variant?: 'primary' | 'prior';
}) {
  const date = entry.soldAt ? dateFormatter.format(new Date(entry.soldAt)) : '—';
  const qtyAtRate = formatQtyAtRate(entry.quantity, Number(entry.priceToRetail) || 0);
  const invoice = entry.invoiceNo?.trim();
  const isPrior = variant === 'prior';

  return (
    <Inline gap="xs" flexWrap align="start">
      <Text
        variant="caption"
        weight={isPrior ? 'medium' : 'semibold'}
        color={isPrior ? 'secondary' : 'primary'}
        className={productChrome.nowrap}
      >
        {date}
      </Text>
      <Text variant="caption" aria-hidden color="muted">
        ·
      </Text>
      <Text
        variant="caption"
        weight="medium"
        color={isPrior ? 'muted' : 'secondary'}
        className={productChrome.nowrap}
      >
        {qtyAtRate}
      </Text>
      {invoice ? (
        <Text variant="caption" weight="semibold" className={productChrome.historyInvoiceChip}>
          {invoice}
        </Text>
      ) : null}
    </Inline>
  );
}

export interface CustomerProductHistoryHintProps {
  sellableRef: string;
  history: CustomerProductHistoryResponse | null;
  loading?: boolean;
}

export function CustomerProductHistoryHint({
  sellableRef,
  history,
  loading = false,
}: CustomerProductHistoryHintProps) {
  const [expanded, setExpanded] = useState(false);
  const group = history?.bySellableRef?.[sellableRef];

  if (loading && !group) {
    return (
      <Box className={productChrome.historyHintRoot}>
        <Inline gap="xs" align="center">
          <Spinner size="sm" />
          <Text variant="caption" color="muted" className={productChrome.italicMuted}>
            Checking past purchases…
          </Text>
        </Inline>
      </Box>
    );
  }

  if (!group?.lastSale) {
    return (
      <Box className={productChrome.historyHintInline}>
        <Badge variant="success">New for customer</Badge>
      </Box>
    );
  }

  const prior = group.history.slice(1);
  const priorLabel = prior.length === 1 ? '1 earlier' : `${prior.length} earlier`;

  return (
    <Box padding="xs" border rounded="md" bg="muted" className={productChrome.historyHintCard}>
      <Inline
        justify="between"
        align="center"
        width="full"
        className={productChrome.historyHintHeader}
      >
        <Badge variant="info">Bought before</Badge>
        {prior.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? 'Hide earlier purchases'
                : `Show ${prior.length} earlier purchase${prior.length === 1 ? '' : 's'}`
            }
          >
            <Inline gap="xs" align="center">
              <Text variant="caption" weight="semibold">
                {expanded ? 'Hide' : priorLabel}
              </Text>
              <Text
                variant="caption"
                aria-hidden
                className={cn(
                  productChrome.historyChevron,
                  expanded && productChrome.historyChevronOpen,
                )}
              >
                ▾
              </Text>
            </Inline>
          </Button>
        ) : null}
      </Inline>

      <HistoryEntryRow entry={group.lastSale} variant="primary" />

      {expanded && prior.length > 0 ? (
        <Stack gap="xs" className={productChrome.historyPriorList}>
          {prior.map((entry) => (
            <Box key={`${entry.purchaseId}-${entry.soldAt}`}>
              <HistoryEntryRow entry={entry} variant="prior" />
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
