import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SellActionSlotProps } from '@inventory-platform/routing';
import { Alert, Button, Inline, Stack, Text, productChrome } from '@inventory-platform/ui-kit';
import {
  appendTickets,
  punchFailedNotice,
  punchedNotice,
  resumeFailedNotice,
  resumedNotice,
  withTicketState,
  type KotTicketView,
  type PunchNotice,
} from '../lib/kotBarState';
import { printKot } from '../lib/printKot';
import { createPrintQueue } from '../lib/printQueue';
import { readParkedAttempt } from '../lib/punchKeyStore';
import { usePunchMutation } from '../queries/hooks';
import type { CafeKot } from '../types/kot';
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

  /**
   * One press, one round.
   *
   * `punch.isPending` disables the button, but only after React has re-rendered; a double
   * click, a keyboard repeat, or a second tap on a slow connection can land inside that
   * window. This ref is set synchronously before the request goes out and cleared only once
   * it has settled, so the second press finds it set no matter how slow the network is. The
   * key the request carries is parked in `sessionStorage` regardless (see
   * `useIdempotentMutation`), so even a press the guard cannot see is replayed by the server
   * rather than cooked twice.
   */
  const inFlightRef = useRef(false);

  /**
   * Every kotId this bar has already put on the print queue.
   *
   * `createPrintQueue` releases an id once its ticket settles, so a ticket the server
   * replays — a resume, or a retried punch answered from its idempotency record — would
   * otherwise reach the printer a second time. The second slip carries the same KOT number
   * and is NOT stamped REPRINT (only `/reprint` stamps), which is precisely what a cook reads
   * as a second order. One set decides both the strip and the queue: a ticket the strip does
   * not add is a ticket the queue does not get.
   *
   * A ref, not the `tickets` state: the decision is made inside an async handler, where a
   * state snapshot from an earlier render would be stale.
   */
  const queuedKotIdsRef = useRef<Set<string>>(new Set());

  const takeFresh = useCallback(
    (punched: CafeKot[]): CafeKot[] => {
      const fresh = punched.filter((kot) => !queuedKotIdsRef.current.has(kot.kotId));
      fresh.forEach((kot) => queuedKotIdsRef.current.add(kot.kotId));
      setTickets((current) => appendTickets(current, fresh));
      fresh.forEach((kot) => queue.enqueue(kot.kotId));
      return fresh;
      // `queue` is created once per mount and never changes identity.
    },
    [queue],
  );

  const handlePunch = useCallback(async () => {
    // `isPending` already disables the button; this guard covers a keyboard or
    // double-click event that lands before React has re-rendered the disabled state.
    if (inFlightRef.current || punch.isPending || !purchaseId) return;
    inFlightRef.current = true;
    setNotice(null);
    try {
      const punched = await punch.mutateAsync();
      setNotice(punchedNotice(punched));
      takeFresh(punched);
    } catch (error) {
      setNotice(punchFailedNotice(error));
    } finally {
      inFlightRef.current = false;
    }
  }, [punch, purchaseId, takeFresh]);

  /**
   * A punch whose response never arrived leaves its key parked in `sessionStorage`, and
   * without this nothing would ever read it back.
   *
   * The server records the punch and creates the tickets before the client hears anything,
   * so a cashier whose connection dropped mid-press finds a cart the kitchen already has:
   * pressing Print KOT again correctly creates nothing ("Nothing new to send"), while the
   * tickets exist and no paper ever came out. Replaying the parked key instead makes the
   * server hand those same tickets back, and they print like any other.
   *
   * Scoped to this cart, which is the only scope this bar has: `VerticalSellActions` keys the
   * slot by `purchaseId`, so switching carts or opening a quotation remounts it and the
   * newly selected cart's stranded round is picked up in turn. No cart is skipped because a
   * different one was stranded first.
   *
   * Once per cart per mount: a resume that keeps failing must not become a loop.
   */
  const resumedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!purchaseId || resumedForRef.current === purchaseId) return;
    resumedForRef.current = purchaseId;
    if (!readParkedAttempt(purchaseId)) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    void (async () => {
      try {
        // A replay, not a second round: `useIdempotentMutation` picks the parked key back up
        // out of `sessionStorage`, and the server answers a key it has already seen with the
        // tickets it made for it.
        const punched = await punch.mutateAsync();
        setNotice(resumedNotice(takeFresh(punched).length));
      } catch (error) {
        setNotice(resumeFailedNotice(error));
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [purchaseId, punch, takeFresh]);

  const handleRetry = useCallback(
    (kotId: string) => {
      queue.enqueue(kotId);
    },
    [queue],
  );

  return (
    <Stack gap="sm" width="full">
      <Inline justify="between" align="center" gap="sm" width="full">
        {/* Short enough to sit on one line beside the button in the order column, which is
            narrow. The long form wrapped onto two lines and crowded the button. */}
        <Text variant="caption" color="secondary">
          Only new items are sent
        </Text>
        <Button
          type="button"
          variant="solid"
          className={productChrome.nowrap}
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
