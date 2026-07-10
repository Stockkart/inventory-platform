import type { CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import { inventorySellableRef } from '@inventory-platform/product/types';
import { Badge, Button, CartQtyStepper, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import { cartLineMetaStyle, cartLineStockStyle, cartLineStyle } from './scanSellStyles';

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
      style={{ ...cartLineStyle, ...cartLineStockStyle }}
      justify="between"
      align="start"
      width="full"
    >
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Inline justify="between" align="center" width="full">
          <Text weight="semibold" truncate>
            {name}
          </Text>
          <Badge variant="neutral">Stock</Badge>
        </Inline>
        <CustomerProductHistoryHint
          sellableRef={inventorySellableRef(inventoryId)}
          history={customerProductHistory ?? null}
          loading={customerProductHistoryLoading}
        />
        <Text variant="caption" color="secondary" style={cartLineMetaStyle}>
          {unitLabel ? `${unitLabel} · ` : ''}
          {money(price)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" align="end" style={{ flexShrink: 0 }}>
        <CartQtyStepper
          value={quantity}
          disabled={disabled}
          onDecrement={() => onChangeQty(-1)}
          onIncrement={() => onChangeQty(1)}
          onCommit={onSetQuantity}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          style={{ flexShrink: 0 }}
          onClick={onRemove}
          disabled={disabled}
        >
          Remove
        </Button>
      </Stack>
    </Inline>
  );
}
