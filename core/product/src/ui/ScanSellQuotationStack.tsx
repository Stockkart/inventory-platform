import type { QuotationSummary } from '@inventory-platform/product/types';
import {
  Button,
  IconButton,
  Inline,
  Stack,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export interface ScanSellQuotationStackProps {
  quotations: QuotationSummary[];
  activePurchaseId: string | null;
  disabled?: boolean;
  onSelect: (purchaseId: string) => void;
  onNew: () => void;
  onCancel: (purchaseId: string) => void;
}

function quotationTabLabel(q: QuotationSummary): string {
  if (q.tokenNo?.trim()) {
    return `Token ${q.tokenNo.trim()}`;
  }
  const name = q.customerName?.trim() ?? '';
  if (!name || name.toLowerCase() === 'general customer') {
    return 'Walk-in';
  }
  return name;
}

export function ScanSellQuotationStack({
  quotations,
  activePurchaseId,
  disabled = false,
  onSelect,
  onNew,
  onCancel,
}: ScanSellQuotationStackProps) {
  if (quotations.length === 0) {
    return null;
  }

  return (
    <Stack
      gap="sm"
      padding="sm"
      border
      rounded="md"
      bg="elevated"
      className={productChrome.quotationStack}
      aria-label="Open quotations"
    >
      <Inline gap="sm" align="center" flexWrap>
        <Text
          variant="caption"
          weight="semibold"
          color="secondary"
          className={productChrome.nowrap}
        >
          Open quotations
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNew}
          disabled={disabled}
          className={productChrome.quotationPill}
        >
          + New
        </Button>
      </Inline>

      <Inline gap="sm" className={productChrome.quotationScroll}>
        {quotations.map((q) => {
          const isActive = q.purchaseId === activePurchaseId;
          const total = formatMoney(Number(q.grandTotal) || 0);
          const tabLabel = quotationTabLabel(q);
          return (
            <Inline
              key={q.purchaseId}
              align="stretch"
              className={cn(
                productChrome.quotationTab,
                isActive && productChrome.quotationTabActive,
              )}
            >
              <Button
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(q.purchaseId)}
                disabled={disabled}
                className={productChrome.quotationTabBtn}
              >
                <Stack gap="none" align="start">
                  <Text weight="semibold" truncate>
                    {tabLabel}
                  </Text>
                  <Text variant="caption" color="muted" className={productChrome.nowrap}>
                    {q.itemCount} item{q.itemCount === 1 ? '' : 's'} · {total}
                  </Text>
                </Stack>
              </Button>
              <IconButton
                label={`Cancel quotation ${tabLabel}`}
                title="Cancel quotation"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(q.purchaseId);
                }}
                disabled={disabled}
                className={productChrome.quotationTabClose}
              >
                ×
              </IconButton>
            </Inline>
          );
        })}
      </Inline>
    </Stack>
  );
}
