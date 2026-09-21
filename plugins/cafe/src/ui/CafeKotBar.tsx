import { useCallback, useMemo, useState } from 'react';
import type { SellActionSlotProps } from '@inventory-platform/routing';
import { Alert, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import {
  appendTickets,
  punchFailedNotice,
  punchedNotice,
  withTicketState,
  type KotTicketView,
  type PunchNotice,
} from '../lib/kotBarState';
import { printKot } from '../lib/printKot';
import { createPrintQueue } from '../lib/printQueue';
import { usePunchMutation } from '../queries/hooks';
import { KotTicketStrip } from './KotTicketStrip';

/**
 * Print KOT for the cafe Sell screen.
 *
 * Mounted through `VerticalPlugin.sellActions` (see `plugins/cafe/src/index.ts`), so
 * `core/product`'s Sell screen never imports this package — `type:core` may not depend
 * on `type:plugin`.
 *
 * The button punches the open cart; the server derives the delta and answers with the
 * tickets it created, so the request carries no body. Printing starts only once the
 * punch has resolved: a ticket on paper that the server never recorded is worse than no
 * ticket at all.
 */
export function CafeKotBar({ purchaseId, disabled = false }: SellActionSlotProps) {
  const [tickets, setTickets] = useState<KotTicketView[]>([]);
  const [notice, setNotice] = useState<PunchNotice | null>(null);
  const punch = usePunchMutation(purchaseId ?? '');

  /**
   * The listener is a bare `setState` and stays that way. `createPrintQueue` calls it
   * from inside its drain loop; anything that can throw here escapes as an unhandled
   * rejection and printing stops for every remaining ticket, silently.
   */
  const queue = useMemo(
    () =>
      createPrintQueue(
        (kotId) => printKot(kotId),
        (kotId, state) => setTickets((current) => withTicketState(current, kotId, state)),
      ),
    [],
  );

  const handlePunch = useCallback(async () => {
    // `isPending` already disables the button; this guard covers a keyboard or
    // double-click event that lands before React has re-rendered the disabled state.
    if (punch.isPending || !purchaseId) return;
    setNotice(null);
    try {
      const punched = await punch.mutateAsync();
      setNotice(punchedNotice(punched));
      setTickets((current) => appendTickets(current, punched));
      punched.forEach((kot) => queue.enqueue(kot.kotId));
    } catch (error) {
      setNotice(punchFailedNotice(error));
    }
  }, [punch, purchaseId, queue]);

  const handleRetry = useCallback(
    (kotId: string) => {
      queue.enqueue(kotId);
    },
    [queue],
  );

  return (
    <Stack gap="sm" width="full">
      <Inline justify="between" align="center" gap="sm" width="full">
        <Text variant="caption" color="secondary">
          Send the new items on this order to the kitchen
        </Text>
        <Button
          type="button"
          variant="solid"
          onClick={() => void handlePunch()}
          disabled={disabled || punch.isPending || !purchaseId}
        >
          {punch.isPending ? 'Sending…' : 'Print KOT'}
        </Button>
      </Inline>
      {notice ? (
        <Alert variant={notice.tone} role={notice.tone === 'danger' ? 'alert' : 'status'}>
          {notice.text}
        </Alert>
      ) : null}
      <KotTicketStrip tickets={tickets} onRetry={handleRetry} />
    </Stack>
  );
}

export default CafeKotBar;
