import type { QuotationSummary } from '@inventory-platform/types';
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
    <div className={styles.quotationBar} aria-label="Open quotations">
      <div className={styles.barRow}>
        <span className={styles.barLabel}>Open quotations</span>
        <button
          type="button"
          className={styles.newBtn}
          onClick={onNew}
          disabled={disabled}
        >
          + New
        </button>
      </div>

      <div className={styles.chipStrip} role="tablist" aria-label="Quotation tabs">
        {quotations.map((q) => {
          const isActive = q.purchaseId === activePurchaseId;
          const total = formatMoney(Number(q.grandTotal) || 0);
          return (
            <div
              key={q.purchaseId}
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              <button
                type="button"
                className={styles.chipMain}
                onClick={() => onSelect(q.purchaseId)}
                disabled={disabled}
              >
                <span className={styles.chipName}>{q.customerName}</span>
                <span className={styles.chipMeta}>
                  {q.itemCount} item{q.itemCount === 1 ? '' : 's'} · {total}
                </span>
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(q.purchaseId);
                }}
                disabled={disabled}
                aria-label={`Cancel quotation for ${q.customerName}`}
                title="Cancel quotation"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
