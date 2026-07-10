import type { QuotationSummary } from '@inventory-platform/product/types';
import { Button, IconButton, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './ScanSellQuotationStack.module.css';

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
    <Stack gap="xs" className={styles.quotationBar} aria-label="Open quotations">
      <Inline className={styles.barRow} gap="sm" align="center">
        <Text variant="caption" weight="semibold" color="secondary" className={styles.barLabel}>
          Open quotations
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.newBtn}
          onClick={onNew}
          disabled={disabled}
        >
          + New
        </Button>
      </Inline>

      <Inline className={styles.chipStrip} gap="sm">
        {quotations.map((q) => {
          const isActive = q.purchaseId === activePurchaseId;
          const total = formatMoney(Number(q.grandTotal) || 0);
          const tabLabel = quotationTabLabel(q);
          return (
            <Inline
              key={q.purchaseId}
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            >
              <Button
                type="button"
                variant="ghost"
                className={styles.chipMain}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(q.purchaseId)}
                disabled={disabled}
              >
                <Stack gap="none" align="start">
                  <Text weight="semibold" className={styles.chipName}>
                    {tabLabel}
                  </Text>
                  <Text variant="caption" color="muted" className={styles.chipMeta}>
                    {q.itemCount} item{q.itemCount === 1 ? '' : 's'} · {total}
                  </Text>
                </Stack>
              </Button>
              <IconButton
                label={`Cancel quotation ${tabLabel}`}
                title="Cancel quotation"
                className={styles.cancelBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(q.purchaseId);
                }}
                disabled={disabled}
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
