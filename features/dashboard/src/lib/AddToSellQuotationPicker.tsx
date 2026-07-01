import type { QuotationSummary } from '@inventory-platform/types';
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
  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-picker-title"
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 id="quotation-picker-title" className={styles.title}>
          Add to quotation
        </h3>
        <p className={styles.subtitle}>
          Choose which open sale should include{' '}
          <strong>{productLabel}</strong>
        </p>

        <button
          type="button"
          className={styles.newBtn}
          onClick={onNewQuotation}
          disabled={isSubmitting}
        >
          + New quotation
        </button>

        <div className={styles.list} role="listbox" aria-label="Open quotations">
          {quotations.map((q) => (
            <button
              key={q.purchaseId}
              type="button"
              className={styles.option}
              onClick={() => onSelect(q.purchaseId)}
              disabled={isSubmitting}
              role="option"
            >
              <span className={styles.optionName}>{q.customerName}</span>
              <span className={styles.optionMeta}>
                {q.itemCount} item{q.itemCount === 1 ? '' : 's'} ·{' '}
                {formatMoney(Number(q.grandTotal) || 0)}
                {q.customerPhone ? ` · ${q.customerPhone}` : ''}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
