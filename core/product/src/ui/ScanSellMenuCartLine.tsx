import { useState } from 'react';
import type {
  CheckoutItemResponse,
  CustomerProductHistoryResponse,
} from '@inventory-platform/product/types';
import { lineSellableRef } from '@inventory-platform/product/types';
import {
  Alert,
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

/**
 * Asks the cashier to confirm before a reduction reaches below what the
 * kitchen already has, or a fully-sent line is removed. Names the station
 * so the confirmation reads as "this dish is being thrown away", not a
 * generic undo.
 */
function confirmWithdrawal(withdrawnQty: number, itemName: string, station: string): boolean {
  return window.confirm(
    `${station} already has ${withdrawnQty} ${itemName}. This will withdraw ${withdrawnQty} from ${station} — that food will be thrown away. Continue?`,
  );
}

const WITHDRAW_FAILURE_MESSAGE =
  "Couldn't update this order. The kitchen may still have the old quantity — try again.";

export interface ScanSellMenuCartLineProps {
  line: CheckoutItemResponse;
  disabled?: boolean;
  customerProductHistory?: CustomerProductHistoryResponse | null;
  customerProductHistoryLoading?: boolean;
  /** Resolves `false` when the update failed so the line can surface it. */
  onChangeQty: (sellableRef: string, delta: number) => Promise<boolean>;
  onSetQuantity: (sellableRef: string, newQty: number) => Promise<boolean>;
  onRemove: (sellableRef: string) => Promise<boolean>;
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
  const [withdrawError, setWithdrawError] = useState(false);
  const ref = lineSellableRef(line) ?? line.name ?? '';
  const lineTotal = line.totalAmount ?? line.priceToRetail * line.quantity;
  const itemName = line.name || 'this item';

  const sentQty = Math.trunc(Number(line.kotSentQuantity ?? 0));
  // Paired against baseQuantity, not quantity: kotSentQuantity counts base units, and the two
  // coincide only while every menu item has a unit factor of 1. Menu portions (Qtr/Half/Full) are
  // the next feature, and they are what makes a sale-unit count diverge from a base-unit one — at
  // which point comparing against `quantity` would badge the wrong number and confirm withdrawing
  // a quantity nobody is withdrawing. Fall back to quantity only when the server omits the field.
  const totalQty = Math.trunc(Number(line.baseQuantity ?? line.quantity));
  const isFullySent = sentQty > 0 && sentQty === totalQty;
  const isPartlySent = sentQty > 0 && sentQty < totalQty;
  const station = line.department?.trim() || 'the kitchen';

  const runWithdrawal = async (action: () => Promise<boolean>) => {
    const ok = await action();
    setWithdrawError(!ok);
  };

  const handleDecrement = () => {
    const nextQty = totalQty - 1;
    if (sentQty > 0 && nextQty < sentQty) {
      if (!confirmWithdrawal(sentQty - nextQty, itemName, station)) return;
    }
    void runWithdrawal(() => onChangeQty(ref, -1));
  };

  const handleIncrement = () => {
    void runWithdrawal(() => onChangeQty(ref, 1));
  };

  const handleCommit = async (newQty: number) => {
    if (sentQty > 0 && newQty < sentQty) {
      if (!confirmWithdrawal(sentQty - newQty, itemName, station)) {
        // Reject so CartQtyStepper resets the draft input to the current quantity.
        throw new Error('withdrawal declined');
      }
    }
    const ok = await onSetQuantity(ref, newQty);
    setWithdrawError(!ok);
    if (!ok) {
      throw new Error('withdrawal failed');
    }
  };

  const handleRemove = () => {
    if (sentQty > 0) {
      if (!confirmWithdrawal(sentQty, itemName, station)) return;
    }
    void runWithdrawal(() => onRemove(ref));
  };

  return (
    <Stack className={cn(cartLineStyle, cartLineMenuStyle)} gap="xs" width="full">
      <Inline justify="between" align="start" width="full" gap="sm">
        <Stack gap="xs" className={surfaceChrome.flexMin0}>
          <Inline gap="sm" align="center" flexWrap>
            <Text as="span" className={cartLineTitleStyle} truncate>
              {line.name || 'Menu item'}
            </Text>
            <Badge variant="info">Menu</Badge>
            {isFullySent ? <Badge variant="success">Sent · {station}</Badge> : null}
            {isPartlySent ? (
              <Badge variant="warning">
                {sentQty}/{totalQty} sent · {station}
              </Badge>
            ) : null}
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
            onDecrement={handleDecrement}
            onIncrement={handleIncrement}
            onCommit={handleCommit}
          />
        </Stack>
      </Inline>
      {withdrawError ? <Alert variant="danger">{WITHDRAW_FAILURE_MESSAGE}</Alert> : null}
      <Inline className={cartLineFooterStyle} justify="between" align="center" width="full">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cartLineRemoveStyle}
          onClick={handleRemove}
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
