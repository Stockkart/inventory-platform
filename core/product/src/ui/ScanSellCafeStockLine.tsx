import { useEffect, useState } from 'react';
import type { CustomerProductHistoryResponse } from '@inventory-platform/types';
import { inventorySellableRef } from '@inventory-platform/types';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import styles from '../pages/scan-sell.module.css';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export interface ScanSellCafeStockLineProps {
  name: string;
  inventoryId: string;
  unitLabel?: string;
  price: number;
  quantity: number;
  lineTotal: number;
  disabled?: boolean;
  customerProductHistory?: CustomerProductHistoryResponse | null;
  customerProductHistoryLoading?: boolean;
  onChangeQty: (delta: number) => void;
  onSetQuantity: (newQty: number) => Promise<void>;
  onRemove: () => void;
}

export function ScanSellCafeStockLine({
  name,
  inventoryId,
  unitLabel,
  price,
  quantity,
  lineTotal,
  disabled = false,
  customerProductHistory,
  customerProductHistoryLoading = false,
  onChangeQty,
  onSetQuantity,
  onRemove,
}: ScanSellCafeStockLineProps) {
  return (
    <div className={styles.cafeStockCartLine}>
      <div className={styles.cafeMenuCartInfo}>
        <div className={styles.cafeMenuCartTop}>
          <span className={styles.cafeMenuCartName}>{name}</span>
          <span className={styles.cafeStockCartBadge}>Stock</span>
        </div>
        <CustomerProductHistoryHint
          sellableRef={inventorySellableRef(inventoryId)}
          history={customerProductHistory ?? null}
          loading={customerProductHistoryLoading}
        />
        <span className={styles.cafeMenuCartMeta}>
          {unitLabel ? `${unitLabel} · ` : ''}
          {money(price)} each · {money(lineTotal)}
        </span>
      </div>
      <div className={styles.cafeMenuCartActions}>
        <div className={styles.qtyStepper}>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(-1)}
            disabled={disabled}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <StockQtyInput
            value={quantity}
            disabled={disabled}
            onCommit={onSetQuantity}
          />
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(1)}
            disabled={disabled}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function StockQtyInput({
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
