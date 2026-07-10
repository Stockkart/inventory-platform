import { useEffect, useState } from 'react';
import type { CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import { inventorySellableRef } from '@inventory-platform/product/types';
import { Badge, Button, IconButton, Inline, Input, Stack, Text } from '@inventory-platform/ui-kit';
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
    <Inline className={styles.cafeStockCartLine} justify="between" align="start" width="full">
      <Stack gap="xs" className={styles.cafeMenuCartInfo}>
        <Inline className={styles.cafeMenuCartTop} justify="between" align="center" width="full">
          <Text weight="semibold" className={styles.cafeMenuCartName}>
            {name}
          </Text>
          <Badge variant="neutral" className={styles.cafeStockCartBadge}>
            Stock
          </Badge>
        </Inline>
        <CustomerProductHistoryHint
          sellableRef={inventorySellableRef(inventoryId)}
          history={customerProductHistory ?? null}
          loading={customerProductHistoryLoading}
        />
        <Text variant="caption" color="secondary" className={styles.cafeMenuCartMeta}>
          {unitLabel ? `${unitLabel} · ` : ''}
          {money(price)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" className={styles.cafeMenuCartActions} align="end">
        <Inline className={styles.qtyStepper} gap="none" align="center">
          <IconButton
            label="Decrease quantity"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(-1)}
            disabled={disabled}
          >
            −
          </IconButton>
          <StockQtyInput value={quantity} disabled={disabled} onCommit={onSetQuantity} />
          <IconButton
            label="Increase quantity"
            onClick={() => onChangeQty(1)}
            disabled={disabled}
            className={styles.qtyBtn}
          >
            +
          </IconButton>
        </Inline>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.removeBtn}
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </Button>
      </Stack>
    </Inline>
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
    <Input
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
