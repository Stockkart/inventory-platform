import type { QuotationSummary } from '@inventory-platform/product/types';
import { Button, IconButton, Inline, Stack, Text } from '@inventory-platform/ui-kit';

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
  return q.customerName?.trim() || 'Order';
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
      style={{ marginBottom: '0.75rem' }}
      aria-label="Open quotations"
    >
      <Inline gap="sm" align="center" flexWrap>
        <Text
          variant="caption"
          weight="semibold"
          color="secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          Open quotations
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNew}
          disabled={disabled}
          style={{
            borderColor: '#93c5fd',
            background: '#eff6ff',
            color: '#1d4ed8',
            borderRadius: '999px',
          }}
        >
          + New
        </Button>
      </Inline>

      <Inline gap="sm" style={{ overflowX: 'auto', paddingBottom: '0.1rem' }}>
        {quotations.map((q) => {
          const isActive = q.purchaseId === activePurchaseId;
          const total = formatMoney(Number(q.grandTotal) || 0);
          const tabLabel = quotationTabLabel(q);
          return (
            <Inline
              key={q.purchaseId}
              align="stretch"
              border
              rounded="lg"
              bg={isActive ? 'muted' : 'surface'}
              style={{
                flexShrink: 0,
                borderRadius: '999px',
                overflow: 'hidden',
                borderColor: isActive ? '#2563eb' : undefined,
                boxShadow: isActive ? '0 0 0 1px #2563eb' : undefined,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(q.purchaseId)}
                disabled={disabled}
                style={{
                  borderRadius: 0,
                  maxWidth: '220px',
                  textAlign: 'left',
                  padding: '0.35rem 0.55rem 0.35rem 0.75rem',
                }}
              >
                <Stack gap="none" align="start">
                  <Text weight="semibold" truncate>
                    {tabLabel}
                  </Text>
                  <Text variant="caption" color="muted" style={{ whiteSpace: 'nowrap' }}>
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
                style={{
                  width: '1.65rem',
                  flexShrink: 0,
                  borderRadius: 0,
                  borderLeft: '1px solid var(--border-subtle, #e2e8f0)',
                }}
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
