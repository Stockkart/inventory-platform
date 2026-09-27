import { Divider, Inline, Skeleton, Stack, Text } from '@inventory-platform/ui-kit';
import type { QuoteResponse } from '@inventory-platform/plan/types';
import { formatRupees } from './planPricing';

interface QuoteSummaryProps {
  quote: QuoteResponse | undefined;
  loading: boolean;
}

/** Renders the server's totals as-is; nothing here is computed on the client. */
export function QuoteSummary({ quote, loading }: QuoteSummaryProps) {
  if (!quote) {
    return loading ? <Skeleton height={96} /> : null;
  }
  return (
    <Stack gap="sm" aria-busy={loading}>
      <Text variant="heading4" weight="semibold">
        Order summary
      </Text>
      {quote.items.map((item) => (
        <Stack key={`${item.type}-${item.code}`} gap="xs">
          <Inline justify="between" width="full">
            <Text>
              {item.name}
              {item.quantity > 1 ? ` × ${item.quantity}` : ''}
            </Text>
            <Text>{formatRupees(item.unitPrice * item.quantity)}</Text>
          </Inline>
          {item.discount > 0 ? (
            <Inline justify="between" width="full">
              <Text variant="caption" color="success">
                {item.voucherCode ? `Voucher ${item.voucherCode}` : 'Discount'}
              </Text>
              <Text variant="caption" color="success">
                −{formatRupees(item.discount)}
              </Text>
            </Inline>
          ) : null}
        </Stack>
      ))}
      <Divider />
      {quote.discountTotal > 0 ? (
        <Inline justify="between" width="full">
          <Text color="secondary">Total savings</Text>
          <Text color="success">−{formatRupees(quote.discountTotal)}</Text>
        </Inline>
      ) : null}
      {quote.walletCredit > 0 ? (
        <Inline justify="between" width="full">
          <Text color="secondary">Wallet credit</Text>
          <Text color="success">−{formatRupees(quote.walletCredit)}</Text>
        </Inline>
      ) : null}
      <Inline justify="between" width="full">
        <Text weight="semibold">Total{quote.taxInclusive ? ' (incl. tax)' : ''}</Text>
        <Text variant="title" weight="bold">
          {formatRupees(quote.grandTotal)}
        </Text>
      </Inline>
    </Stack>
  );
}
