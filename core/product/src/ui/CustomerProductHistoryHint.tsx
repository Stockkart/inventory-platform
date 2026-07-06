import { useState } from 'react';
import type { CustomerProductHistoryGroup, CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './CustomerProductHistoryHint.module.css';

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
  const qtyAtRate = formatQtyAtRate(
    entry.quantity,
    Number(entry.priceToRetail) || 0
  );
  const invoice = entry.invoiceNo?.trim();

  return (
    <Inline
      gap="xs"
      className={variant === 'primary' ? styles.entryRow : styles.entryRowPrior}
    >
      <Text variant="caption" className={styles.entryDate}>
        {date}
      </Text>
      <Text variant="caption" aria-hidden className={styles.entryDot}>
        ·
      </Text>
      <Text variant="caption" className={styles.entryQtyRate}>
        {qtyAtRate}
      </Text>
      {invoice ? (
        <Text variant="caption" className={styles.entryInvoice}>
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
      <Box className={styles.hint}>
        <Inline gap="xs" align="center">
          <Box className={styles.loadingPulse} />
          <Text variant="caption" className={styles.loadingText}>
            Checking past purchases…
          </Text>
        </Inline>
      </Box>
    );
  }

  if (!group?.lastSale) {
    return (
      <Box className={`${styles.hint} ${styles.hintNew}`}>
        <Badge variant="neutral" className={styles.newBadge}>
          New for customer
        </Badge>
      </Box>
    );
  }

  const prior = group.history.slice(1);
  const priorLabel =
    prior.length === 1 ? '1 earlier' : `${prior.length} earlier`;

  return (
    <Box className={`${styles.hint} ${styles.hintHasHistory}`}>
      <Inline className={styles.header} justify="between" width="full">
        <Badge variant="info" className={styles.historyBadge}>
          Bought before
        </Badge>
        {prior.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.expandBtn}
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? 'Hide earlier purchases'
                : `Show ${prior.length} earlier purchase${prior.length === 1 ? '' : 's'}`
            }
          >
            <Inline gap="xs" align="center">
              <Text variant="caption" className={styles.expandLabel}>
                {expanded ? 'Hide' : priorLabel}
              </Text>
              <Text
                variant="caption"
                aria-hidden
                className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
              >
                ▾
              </Text>
            </Inline>
          </Button>
        ) : null}
      </Inline>

      <HistoryEntryRow entry={group.lastSale} variant="primary" />

      {expanded && prior.length > 0 ? (
        <Stack as="ul" gap="xs" className={styles.priorList}>
          {prior.map((entry) => (
            <Box as="li" key={`${entry.purchaseId}-${entry.soldAt}`}>
              <HistoryEntryRow entry={entry} variant="prior" />
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
