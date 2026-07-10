import type { QuotationSummary } from '@inventory-platform/product/types';
import { Button, Modal, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './AddToSellQuotationPicker.module.css';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export interface AddToSellQuotationPickerProps {
  open: boolean;
  productLabel: string;
  quotations: QuotationSummary[];
  isSubmitting: boolean;
  onSelect: (purchaseId: string) => void;
  onNewQuotation: () => void;
  onCancel: () => void;
}

export function AddToSellQuotationPicker({
  open,
  productLabel,
  quotations,
  isSubmitting,
  onSelect,
  onNewQuotation,
  onCancel,
}: AddToSellQuotationPickerProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <Modal.Header title="Add to quotation" onClose={onCancel} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            Choose which open sale should include <Text weight="semibold">{productLabel}</Text>
          </Text>

          <Button
            type="button"
            variant="outline"
            fullWidth
            className={styles.newBtn}
            onClick={onNewQuotation}
            disabled={isSubmitting}
          >
            + New quotation
          </Button>

          <Stack gap="sm" className={styles.list} aria-label="Open quotations">
            {quotations.map((q) => (
              <Button
                key={q.purchaseId}
                type="button"
                variant="outline"
                className={styles.option}
                onClick={() => onSelect(q.purchaseId)}
                disabled={isSubmitting}
              >
                <Text weight="semibold" className={styles.optionName}>
                  {q.customerName}
                </Text>
                <Text variant="caption" color="muted" className={styles.optionMeta}>
                  {q.itemCount} item{q.itemCount === 1 ? '' : 's'} ·{' '}
                  {formatMoney(Number(q.grandTotal) || 0)}
                  {q.customerPhone ? ` · ${q.customerPhone}` : ''}
                </Text>
              </Button>
            ))}
          </Stack>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
