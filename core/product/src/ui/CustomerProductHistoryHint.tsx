import { useState } from 'react';
import type {
  CustomerProductHistoryGroup,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import {
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

function formatRate(price: number): string {
  if (!Number.isFinite(price)) return '₹0';
  const isWhole = price % 1 === 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(price);
}

type SaleEntry = NonNullable<CustomerProductHistoryGroup['lastSale']>;

function formatQty(qty: SaleEntry['quantity']): string {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty);
  return n === 1 ? '1 pc' : `${n} pcs`;
}

function formatDiscountPercent(discount: number | null | undefined): string {
  if (discount == null || !Number.isFinite(Number(discount))) return '—';
  const n = Number(discount);
  const isWhole = n % 1 === 0;
  return `${isWhole ? n.toFixed(0) : n.toFixed(2)}%`;
}

function formatSchemeApplied(entry: SaleEntry): string {
  const schemeType = entry.schemeType;
  const percentage = entry.schemePercentage;
  const payFor = entry.schemePayFor;
  const free = entry.schemeFree;
  if (schemeType === 'PERCENTAGE' && percentage != null && Number.isFinite(Number(percentage))) {
    const n = Number(percentage);
    const isWhole = n % 1 === 0;
    return `${isWhole ? n.toFixed(0) : n.toFixed(2)}%`;
  }
  if (payFor != null || free != null) {
    return `${payFor ?? 0} + ${free ?? 0}`;
  }
  if (percentage != null && Number.isFinite(Number(percentage)) && Number(percentage) !== 0) {
    const n = Number(percentage);
    const isWhole = n % 1 === 0;
    return `${isWhole ? n.toFixed(0) : n.toFixed(2)}%`;
  }
  return '—';
}

function MetaDot() {
  return (
    <Text as="span" variant="caption" color="muted" aria-hidden>
      ·
    </Text>
  );
}

function HistoryEntryRow({
  entry,
  primary = false,
  compact = false,
}: {
  entry: SaleEntry;
  primary?: boolean;
  compact?: boolean;
}) {
  const date = entry.soldAt ? dateFormatter.format(new Date(entry.soldAt)) : '—';
  const qty = formatQty(entry.quantity);
  const ptr = formatRate(Number(entry.priceToRetail) || 0);
  const discount = formatDiscountPercent(entry.saleAdditionalDiscount);
  const scheme = formatSchemeApplied(entry);
  const invoice = entry.invoiceNo?.trim();

  const summary = (
    <Inline gap="xs" align="center" flexWrap className={productChrome.historyEntrySummary}>
      <Text
        as="span"
        variant="caption"
        weight={primary ? 'semibold' : 'medium'}
        color={primary ? 'primary' : 'secondary'}
      >
        {date}
      </Text>
      <MetaDot />
      <Text as="span" variant="caption" color="secondary">
        {qty}
      </Text>
      <MetaDot />
      <Text as="span" variant="caption" className={productChrome.historyPricePart}>
        <Text as="span" variant="caption" color="muted" className={productChrome.historyMetaLabel}>
          PTR
        </Text>{' '}
        <Text
          as="span"
          variant="caption"
          weight="bold"
          color="primary"
          className={productChrome.historyRate}
        >
          {ptr}
        </Text>
      </Text>
      <MetaDot />
      <Text as="span" variant="caption" className={productChrome.historyPricePart}>
        <Text as="span" variant="caption" color="muted" className={productChrome.historyMetaLabel}>
          Disc
        </Text>{' '}
        <Text as="span" variant="caption" weight="semibold" color="secondary">
          {discount}
        </Text>
      </Text>
      <MetaDot />
      <Text as="span" variant="caption" className={productChrome.historyPricePart}>
        <Text as="span" variant="caption" color="muted" className={productChrome.historyMetaLabel}>
          Scheme
        </Text>{' '}
        <Text as="span" variant="caption" weight="semibold" color="secondary">
          {scheme}
        </Text>
      </Text>
      {compact && invoice ? (
        <>
          <MetaDot />
          <Text
            as="span"
            variant="caption"
            weight="medium"
            className={productChrome.historyInvoiceChip}
            title={invoice}
          >
            {invoice}
          </Text>
        </>
      ) : null}
    </Inline>
  );

  if (compact) {
    return summary;
  }

  return (
    <Inline
      gap="sm"
      align="center"
      justify="between"
      width="full"
      className={productChrome.historyEntryRow}
    >
      {summary}
      {invoice ? (
        <Text
          as="span"
          variant="caption"
          weight="medium"
          className={productChrome.historyInvoiceChip}
          title={invoice}
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
  /**
   * `card` — list / card cart lines.
   * `subrow` — compact strip for dense grid (skip “new for customer”).
   */
  variant?: 'card' | 'subrow';
}

/** Whether grid should render a history sub-row under the line item. */
export function shouldShowCustomerHistorySubrow(
  sellableRef: string,
  history: CustomerProductHistoryResponse | null,
  loading?: boolean,
): boolean {
  if (loading) return true;
  return Boolean(history?.bySellableRef?.[sellableRef]?.lastSale);
}

export function CustomerProductHistoryHint({
  sellableRef,
  history,
  loading = false,
  variant = 'card',
}: CustomerProductHistoryHintProps) {
  const [expanded, setExpanded] = useState(false);
  const group = history?.bySellableRef?.[sellableRef];
  const isSubrow = variant === 'subrow';

  if (loading && !group) {
    return (
      <Box
        className={cn(
          !isSubrow && productChrome.historyHintRoot,
          isSubrow && productChrome.historyHintSubrow,
        )}
      >
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
    if (isSubrow) return null;
    return (
      <Box className={cn(productChrome.historyHintInline, productChrome.historyHintNew)}>
        <Text
          as="span"
          variant="caption"
          weight="semibold"
          className={productChrome.historyNewLabel}
        >
          New for customer
        </Text>
      </Box>
    );
  }

  const allPurchases = group.history.length > 0 ? group.history : [group.lastSale];
  const totalCount = allPurchases.length;
  const hasMultiple = totalCount > 1;
  const priorCount = Math.max(totalCount - 1, 0);
  const visibleEntries = expanded && hasMultiple ? allPurchases : [allPurchases[0]];

  if (isSubrow) {
    return (
      <Box className={productChrome.historyHintSubrow}>
        <Inline
          gap="sm"
          align="center"
          justify="between"
          width="full"
          flexWrap
          className={productChrome.historyHintSubrowMain}
        >
          <Inline gap="xs" align="center" flexWrap className={productChrome.historyHintSubrowLead}>
            <Text
              as="span"
              variant="caption"
              weight="semibold"
              className={productChrome.historyLabel}
            >
              Bought before
            </Text>
            {hasMultiple ? (
              <Text as="span" variant="caption" className={productChrome.historyCountChip}>
                {totalCount}
              </Text>
            ) : null}
            <Text as="span" variant="caption" color="muted" aria-hidden>
              ·
            </Text>
            <HistoryEntryRow entry={allPurchases[0]} primary compact />
          </Inline>
          {hasMultiple ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={productChrome.historyToggle}
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-label={
                expanded ? 'Hide earlier purchases' : `Show ${priorCount} earlier purchases`
              }
            >
              <Inline gap="xs" align="center">
                <Text as="span" variant="caption" weight="semibold" color="secondary">
                  {expanded ? 'Hide' : `${priorCount} more`}
                </Text>
                <Text
                  as="span"
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

        {expanded && priorCount > 0 ? (
          <Stack gap="none" className={productChrome.historyHintSubrowExtra}>
            {allPurchases.slice(1).map((entry, index) => (
              <Box
                key={`${entry.purchaseId}-${entry.soldAt}-${index}`}
                className={cn(productChrome.historyEntryItem, productChrome.historyEntryItemBorder)}
              >
                <HistoryEntryRow entry={entry} compact />
              </Box>
            ))}
          </Stack>
        ) : null}
      </Box>
    );
  }

  return (
    <Box className={productChrome.historyHintCard}>
      <Inline
        justify="between"
        align="center"
        width="full"
        gap="sm"
        className={productChrome.historyHintHeader}
      >
        <Inline gap="xs" align="center">
          <Text
            as="span"
            variant="caption"
            weight="semibold"
            className={productChrome.historyLabel}
          >
            Bought before
          </Text>
          {hasMultiple ? (
            <Text as="span" variant="caption" className={productChrome.historyCountChip}>
              {totalCount}
            </Text>
          ) : null}
        </Inline>
        {hasMultiple ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={productChrome.historyToggle}
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={
              expanded ? 'Hide earlier purchases' : `Show ${priorCount} earlier purchases`
            }
          >
            <Inline gap="xs" align="center">
              <Text as="span" variant="caption" weight="semibold" color="secondary">
                {expanded ? 'Hide' : `${priorCount} more`}
              </Text>
              <Text
                as="span"
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

      <Stack gap="none" className={productChrome.historyEntryList}>
        {visibleEntries.map((entry, index) => (
          <Box
            key={`${entry.purchaseId}-${entry.soldAt}-${index}`}
            className={cn(
              productChrome.historyEntryItem,
              index > 0 && productChrome.historyEntryItemBorder,
            )}
          >
            <HistoryEntryRow entry={entry} primary={index === 0} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
