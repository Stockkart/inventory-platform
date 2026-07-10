import { useEffect, useState } from 'react';
import type { CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import { inventorySellableRef } from '@inventory-platform/product/types';
import { Badge, Button, IconButton, Inline, Input, Stack, Text } from '@inventory-platform/ui-kit';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import lineStyles from './scan-sell-cart-line.module.css';
import qtyStyles from './scan-sell-qty.module.css';

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
    <Inline
      className={`${lineStyles.line} ${lineStyles.lineStock}`}
      justify="between"
      align="start"
      width="full"
    >
      <Stack gap="xs" className={lineStyles.info}>
        <Inline className={lineStyles.top} justify="between" align="center" width="full">
          <Text weight="semibold" truncate className={lineStyles.name}>
            {name}
          </Text>
          <Badge variant="neutral" className={lineStyles.badgeStock}>
            Stock
          </Badge>
        </Inline>
        <CustomerProductHistoryHint
          sellableRef={inventorySellableRef(inventoryId)}
          history={customerProductHistory ?? null}
          loading={customerProductHistoryLoading}
        />
        <Text variant="caption" color="secondary" className={lineStyles.meta}>
          {unitLabel ? `${unitLabel} · ` : ''}
          {money(price)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" className={lineStyles.actions} align="end">
        <Inline className={qtyStyles.qtyStepper} gap="none" align="center">
          <IconButton
            label="Decrease quantity"
            className={qtyStyles.qtyBtn}
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
            className={qtyStyles.qtyBtn}
          >
            +
          </IconButton>
        </Inline>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={qtyStyles.removeBtn}
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
      className={qtyStyles.qtyInput}
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
