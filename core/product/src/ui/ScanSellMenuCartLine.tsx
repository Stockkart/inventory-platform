import { useEffect, useState } from 'react';
import type {
  CheckoutItemResponse,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import { Badge, Button, IconButton, Inline, Input, Stack, Text } from '@inventory-platform/ui-kit';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import lineStyles from './scan-sell-cart-line.module.css';
import qtyStyles from './scan-sell-qty.module.css';

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
    <Inline
      className={`${lineStyles.line} ${lineStyles.lineMenu}`}
      justify="between"
      align="start"
      width="full"
    >
      <Stack gap="xs" className={lineStyles.info}>
        <Inline className={lineStyles.top} justify="between" align="center" width="full">
          <Text weight="semibold" truncate className={lineStyles.name}>
            {line.name || 'Menu item'}
          </Text>
          <Badge variant="info" className={lineStyles.badgeMenu}>
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
        <Text variant="caption" color="secondary" className={lineStyles.meta}>
          {money(line.priceToRetail)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" className={lineStyles.actions} align="end">
        <Inline className={qtyStyles.qtyStepper} gap="none" align="center">
          <IconButton
            label="Decrease quantity"
            className={qtyStyles.qtyBtn}
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
            className={qtyStyles.qtyBtn}
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
          className={qtyStyles.removeBtn}
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
