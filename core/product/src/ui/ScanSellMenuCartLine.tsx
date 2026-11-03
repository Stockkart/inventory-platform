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
 * kitchen already has, or a fully-sent line is removed. Names the station,
 * and says plainly that the station is **not** told.
 *
 * The server does create a CANCEL ticket for this reduction, stamped and routed to the
 * station — but nothing prints it. The browser is the only printer in this system
 * (`plugins/cafe/src/lib/printKot.ts` is the only transport, and the Go print bridge is
 * deferred), the reduction path returns no ticket id, and `core/product` may not import
 * the cafe plugin that owns the transport. So the slip stays in Mongo and the cook keeps
 * cooking. Until that round trip exists, this confirmation must not imply otherwise: a
 * cashier who reads "that food will be thrown away" stops telling the kitchen, which is
 * worse than no confirmation at all. See `plugins/cafe/README.md`, "Known gap".
 */
function confirmWithdrawal(withdrawnQty: number, itemName: string, station: string): boolean {
  return window.confirm(
    `${station} already has ${withdrawnQty} ${itemName}. This changes the bill only — no cancellation slip is printed, so ${station} will keep making it unless you tell them yourself. Continue?`,
  );
}

const WITHDRAW_FAILURE_MESSAGE =
  "Couldn't update this order. The kitchen may still have the old quantity — try again.";

export interface ScanSellMenuCartLineProps {
  line: CheckoutItemResponse;
  disabled?: boolean;
  /**
   * Accepted and ignored. A cafe line shows no purchase history — a counter serves walk-ins,
   * so a guest's last order is noise here. The props stay so the shared Sell screen can pass
   * the same pair to every cart line without branching on the vertical.
   */
  customerProductHistory?: CustomerProductHistoryResponse | null;
  /** Accepted and ignored — see {@link customerProductHistory}. */
  customerProductHistoryLoading?: boolean;
  /** Resolves `false` when the update failed so the line can surface it. */
  onChangeQty: (sellableRef: string, delta: number) => Promise<boolean>;
  onSetQuantity: (sellableRef: string, newQty: number) => Promise<boolean>;
  onRemove: (sellableRef: string) => Promise<boolean>;
}

export function ScanSellMenuCartLine({
  line,
  disabled = false,
  onChangeQty,
  onSetQuantity,
  onRemove,
}: ScanSellMenuCartLineProps) {
  const [withdrawError, setWithdrawError] = useState(false);
  const ref = lineSellableRef(line) ?? line.name ?? '';
  const lineTotal = line.totalAmount ?? line.priceToRetail * line.quantity;
  const itemName = line.name || 'this item';

  const sentQty = Math.trunc(Number(line.kotSentQuantity ?? 0));
  // Everything the kitchen knows about is counted in BASE units: kotSentQuantity, baseQuantity.
  // Everything the stepper deals in is counted in SALE units: line.quantity, the value the
  // cashier types, the delta handed to onChangeQty. The two coincide only while every menu item
  // has a unit factor of 1. Menu portions (Qtr/Half/Full) are the next feature and are exactly
  // what makes them diverge — so every comparison against sentQty converts the sale-unit figure
  // to base units first, via `toBaseQty`, instead of comparing the two scales directly.
  const unitFactor = Number(line.unitFactor ?? 1) || 1;
  const toBaseQty = (saleQty: number) => Math.trunc(saleQty * unitFactor);
  const totalQty = Math.trunc(Number(line.baseQuantity ?? toBaseQty(line.quantity)));
  const isFullySent = sentQty > 0 && sentQty === totalQty;
  const isPartlySent = sentQty > 0 && sentQty < totalQty;
  const station = line.department?.trim() || 'the kitchen';

  const runWithdrawal = async (action: () => Promise<boolean>) => {
    const ok = await action();
    setWithdrawError(!ok);
  };

  const handleDecrement = () => {
    // One step down is one SALE unit; what it leaves the kitchen holding is measured in base.
    const nextBaseQty = toBaseQty(line.quantity - 1);
    if (sentQty > 0 && nextBaseQty < sentQty) {
      if (!confirmWithdrawal(sentQty - nextBaseQty, itemName, station)) return;
    }
    void runWithdrawal(() => onChangeQty(ref, -1));
  };

  const handleIncrement = () => {
    void runWithdrawal(() => onChangeQty(ref, 1));
  };

  const handleCommit = async (newQty: number) => {
    // `newQty` is what the cashier typed into the stepper — a SALE-unit count.
    const nextBaseQty = toBaseQty(newQty);
    if (sentQty > 0 && nextBaseQty < sentQty) {
      if (!confirmWithdrawal(sentQty - nextBaseQty, itemName, station)) {
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
          {/* No purchase history on a cafe line. A counter serves walk-ins, so what this guest
              bought last time is noise the cashier reads past — and it pushed the station badge
              and the price down the line. The hint stays on the inventory lines, where a
              returning customer's last purchase genuinely informs the sale. */}
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
