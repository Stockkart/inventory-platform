import type {
  CheckoutItemResponse,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import { Badge, Button, CartQtyStepper, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import { cartLineMenuStyle, cartLineMetaStyle, cartLineStyle } from './scanSellStyles';

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
      style={{ ...cartLineStyle, ...cartLineMenuStyle }}
      justify="between"
      align="start"
      width="full"
    >
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Inline justify="between" align="center" width="full">
          <Text weight="semibold" truncate>
            {line.name || 'Menu item'}
          </Text>
          <Badge variant="info">Menu</Badge>
        </Inline>
        {ref ? (
          <CustomerProductHistoryHint
            sellableRef={ref}
            history={customerProductHistory ?? null}
            loading={customerProductHistoryLoading}
          />
        ) : null}
        <Text variant="caption" color="secondary" style={cartLineMetaStyle}>
          {money(line.priceToRetail)} each · {money(lineTotal)}
        </Text>
      </Stack>
      <Stack gap="sm" align="end" style={{ flexShrink: 0 }}>
        <CartQtyStepper
          value={line.quantity}
          disabled={disabled}
          onDecrement={() => onChangeQty(ref, -1)}
          onIncrement={() => onChangeQty(ref, 1)}
          onCommit={(newQty) => onSetQuantity(ref, newQty)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          style={{ flexShrink: 0 }}
          onClick={() => onRemove(ref)}
          disabled={disabled}
        >
          Remove
        </Button>
      </Stack>
    </Inline>
  );
}
