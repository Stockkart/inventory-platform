import type {
  CheckoutItemResponse,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import {
  Badge,
  Button,
  CartQtyStepper,
  Inline,
  Stack,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { CustomerProductHistoryHint } from './CustomerProductHistoryHint';
import {
  cartLineActionsStyle,
  cartLineFooterStyle,
  cartLineMenuStyle,
  cartLineMetaStyle,
  cartLineRemoveStyle,
  cartLineStyle,
  cartLineTitleStyle,
  cartLineTotalStyle,
} from './scanSellStyles';

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
    <Stack className={cn(cartLineStyle, cartLineMenuStyle)} gap="xs" width="full">
      <Inline justify="between" align="start" width="full" gap="sm">
        <Stack gap="xs" className={surfaceChrome.flexMin0}>
          <Inline gap="sm" align="center" flexWrap>
            <Text as="span" className={cartLineTitleStyle} truncate>
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
          <Text variant="caption" className={cartLineMetaStyle}>
            {money(line.priceToRetail)} each
          </Text>
        </Stack>
        <Stack className={cartLineActionsStyle}>
          <CartQtyStepper
            value={line.quantity}
            disabled={disabled}
            onDecrement={() => onChangeQty(ref, -1)}
            onIncrement={() => onChangeQty(ref, 1)}
            onCommit={(newQty) => onSetQuantity(ref, newQty)}
          />
        </Stack>
      </Inline>
      <Inline className={cartLineFooterStyle} justify="between" align="center" width="full">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cartLineRemoveStyle}
          onClick={() => onRemove(ref)}
          disabled={disabled}
        >
          Remove
        </Button>
        <Text as="span" className={cartLineTotalStyle}>
          {money(lineTotal)}
        </Text>
      </Inline>
    </Stack>
  );
}
