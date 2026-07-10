import { useState } from 'react';
import type {
  CustomerProductHistoryGroup,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { Badge, Box, Button, Inline, Spinner, Stack, Text } from '@inventory-platform/ui-kit';

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
        style={{ whiteSpace: 'nowrap' }}
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
        style={{ whiteSpace: 'nowrap' }}
      >
        {qtyAtRate}
      </Text>
      {invoice ? (
        <Text
          variant="caption"
          weight="semibold"
          style={{
            marginLeft: '0.1rem',
            padding: '0.05rem 0.35rem',
            borderRadius: '4px',
            background: '#fff',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.65rem',
            whiteSpace: 'nowrap',
          }}
        >
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
      <Box style={{ marginTop: '0.35rem' }}>
        <Inline gap="xs" align="center">
          <Spinner size="sm" />
          <Text variant="caption" color="muted" style={{ fontStyle: 'italic' }}>
            Checking past purchases…
          </Text>
        </Inline>
      </Box>
    );
  }

  if (!group?.lastSale) {
    return (
      <Box style={{ marginTop: '0.35rem', display: 'inline-flex' }}>
        <Badge variant="success">New for customer</Badge>
      </Box>
    );
  }

  const prior = group.history.slice(1);
  const priorLabel = prior.length === 1 ? '1 earlier' : `${prior.length} earlier`;

  return (
    <Box
      padding="xs"
      border
      rounded="md"
      bg="muted"
      style={{ marginTop: '0.35rem', maxWidth: '100%' }}
    >
      <Inline justify="between" align="center" width="full" style={{ marginBottom: '0.2rem' }}>
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
                style={{
                  transform: expanded ? 'rotate(180deg)' : undefined,
                  transition: 'transform 0.15s ease',
                }}
              >
                ▾
              </Text>
            </Inline>
          </Button>
        ) : null}
      </Inline>

      <HistoryEntryRow entry={group.lastSale} variant="primary" />

      {expanded && prior.length > 0 ? (
        <Stack
          gap="xs"
          style={{
            marginTop: '0.3rem',
            paddingTop: '0.25rem',
            paddingLeft: '0.55rem',
            borderLeft: '2px solid #ddd6fe',
          }}
        >
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
