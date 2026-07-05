import { useEffect, useState } from 'react';
import type { CheckoutItemResponse, CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import styles from '../pages/scan-sell.module.css';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export interface ScanSellMenuCartLineProps {
  line: CheckoutItemResponse;
  disabled?: boolean;
  customerProductHistory?: CustomerProductHistoryResponse | null;
  customerProductHistoryLoading?: boolean;
  onChangeQty: (sellableRef: string, delta: number) => void;
  onSetQuantity: (sellableRef: string, newQty: number) => Promise<void>;
  onRemove: (sellableRef: string) => void;
}

export function ScanSellMenuCartLine({
  line,
  disabled = false,
  customerProductHistory,
  customerProductHistoryLoading = false,
  onChangeQty,
  onSetQuantity,
  onRemove,
}: ScanSellMenuCartLineProps) {
  const ref = lineSellableRef(line) ?? line.name ?? '';
  const lineTotal = line.totalAmount ?? line.priceToRetail * line.quantity;

  return (
    <div className={`${styles.cafeMenuCartLine}`}>
      <div className={styles.cafeMenuCartInfo}>
        <div className={styles.cafeMenuCartTop}>
          <span className={styles.cafeMenuCartName}>
            {line.name || 'Menu item'}
          </span>
          <span className={styles.cafeMenuCartBadge}>Menu</span>
        </div>
        {ref && (
          <CustomerProductHistoryHint
            sellableRef={ref}
            history={customerProductHistory ?? null}
            loading={customerProductHistoryLoading}
          />
        )}
        <span className={styles.cafeMenuCartMeta}>
          {money(line.priceToRetail)} each · {money(lineTotal)}
        </span>
      </div>
      <div className={styles.cafeMenuCartActions}>
        <div className={styles.qtyStepper}>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(ref, -1)}
            disabled={disabled}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <MenuQtyInput
            value={line.quantity}
            disabled={disabled}
            onCommit={(newQty) => onSetQuantity(ref, newQty)}
          />
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(ref, 1)}
            disabled={disabled}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={() => onRemove(ref)}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function MenuQtyInput({
  value,
  onCommit,
  disabled,
}: {
  value: number;
  onCommit: (newQty: number) => Promise<void>;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const qty = Number(draft);
    if (!Number.isFinite(qty) || qty <= 0 || qty === value) {
      setDraft(String(value));
      return;
    }
    try {
      await onCommit(qty);
    } catch {
      setDraft(String(value));
    }
  };

  return (
    <input
      type="number"
      className={styles.qtyInput}
      value={draft}
      min={1}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          void commit();
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}
