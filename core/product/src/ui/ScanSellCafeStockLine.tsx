import type { ReactNode } from 'react';
import type { CustomerProductHistoryResponse } from '@inventory-platform/product/types';
import { inventorySellableRef } from '@inventory-platform/product/types';
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
  cartLineMetaStyle,
  cartLineRemoveStyle,
  cartLineStockStyle,
  cartLineStyle,
  cartLineTitleStyle,
  cartLineTotalStyle,
} from './scanSellStyles';

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
  /** Per-line margin caption. Caller decides whether purchase-side figures may be shown. */
  marginNote?: ReactNode;
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
  marginNote,
  onChangeQty,
  onSetQuantity,
  onRemove,
}: ScanSellCafeStockLineProps) {
  return (
    <Stack className={cn(cartLineStyle, cartLineStockStyle)} gap="xs" width="full">
      <Inline justify="between" align="start" width="full" gap="sm">
        <Stack gap="xs" className={surfaceChrome.flexMin0}>
          <Inline gap="sm" align="center" flexWrap>
            <Text as="span" className={cartLineTitleStyle} truncate>
              {name}
            </Text>
            <Badge variant="neutral">Stock</Badge>
          </Inline>
          <CustomerProductHistoryHint
            sellableRef={inventorySellableRef(inventoryId)}
            history={customerProductHistory ?? null}
            loading={customerProductHistoryLoading}
          />
          <Text variant="caption" className={cartLineMetaStyle}>
            {unitLabel ? `${unitLabel} · ` : ''}
            {money(price)} each
          </Text>
          {marginNote}
        </Stack>
        <Stack className={cartLineActionsStyle}>
          <CartQtyStepper
            value={quantity}
            disabled={disabled}
            onDecrement={() => onChangeQty(-1)}
            onIncrement={() => onChangeQty(1)}
            onCommit={onSetQuantity}
          />
        </Stack>
      </Inline>
      <Inline className={cartLineFooterStyle} justify="between" align="center" width="full">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cartLineRemoveStyle}
          onClick={onRemove}
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
