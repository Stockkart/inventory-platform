import { useEffect, useState } from 'react';
import type {
  CheckoutItemResponse,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import { Badge, Button, IconButton, Inline, Input, Stack, Text } from '@inventory-platform/ui-kit';
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
    <Inline className={styles.cafeMenuCartLine} justify="between" align="start" width="full">
      <Stack gap="xs" className={styles.cafeMenuCartInfo}>
        <Inline className={styles.cafeMenuCartTop} justify="between" align="center" width="full">
          <Text weight="semibold" className={styles.cafeMenuCartName}>
            {line.name || 'Menu item'}
          </Text>
          <Badge variant="info" className={styles.cafeMenuCartBadge}>
            Menu
          </Badge>
        </Inline>
        {ref ? (
          <CustomerProductHistoryHint
            sellableRef={ref}
            history={customerProductHistory ?? null}
            loading={customerProductHistoryLoading}
          />
        ) : null}
        <Text variant="caption" color="secondary" className={styles.cafeMenuCartMeta}>
          {money(line.priceToRetail)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" className={styles.cafeMenuCartActions} align="end">
        <Inline className={styles.qtyStepper} gap="none" align="center">
          <IconButton
            label="Decrease quantity"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(ref, -1)}
            disabled={disabled}
          >
            −
          </IconButton>
          <MenuQtyInput
            value={line.quantity}
            disabled={disabled}
            onCommit={(newQty) => onSetQuantity(ref, newQty)}
          />
          <IconButton
            label="Increase quantity"
            className={styles.qtyBtn}
            onClick={() => onChangeQty(ref, 1)}
            disabled={disabled}
          >
            +
          </IconButton>
        </Inline>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.removeBtn}
          onClick={() => onRemove(ref)}
          disabled={disabled}
        >
          Remove
        </Button>
      </Stack>
    </Inline>
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
