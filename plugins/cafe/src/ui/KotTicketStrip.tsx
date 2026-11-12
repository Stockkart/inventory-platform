import { useState } from 'react';
import { openPdfPreview } from '@inventory-platform/product/print';
import { Alert, Box, Button, Inline, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import type { PrintState } from '../lib/printQueue';
import { useReprintKotMutation } from '../queries/hooks';
import type { CafeKot } from '../types/kot';

export interface KotTicketStripProps {
  tickets: Array<{ kot: CafeKot; state: PrintState }>;
  /**
   * Tickets this bill sent before the bar mounted (another cart switch, a reload). The
   * bar's own `tickets` die with it, so without these a slip lost in the kitchen would have
   * no way back to paper. Anything already in `tickets` is left out by the caller.
   */
  earlier?: CafeKot[];
  onRetry: (kotId: string) => void;
}

const STATE_LABEL: Record<PrintState, string> = {
  READY: 'Ready to print',
  QUEUED: 'Queued',
  PRINTING: 'Printing…',
  PRINTED: 'Printed',
  FAILED: 'Failed',
};

/**
 * Reprint for a ticket that has already reached paper.
 *
 * Its own component because the reprint hook is keyed by ticket id: that key is what keeps a
 * retried reprint of *this* slip from being replayed onto a different one. The PDF opened is
 * the blob the reprint call returned — only that render carries the REPRINT stamp, and an
 * unstamped slip for food already being made reads to a cook as a second order.
 */
function ReprintButton({
  kotId,
  onFailed,
}: {
  kotId: string;
  onFailed: (failed: boolean) => void;
}) {
  const reprint = useReprintKotMutation(kotId);

  const handleReprint = async () => {
    onFailed(false);
    try {
      const blob = await reprint.mutateAsync();
      openPdfPreview(blob, `kot_${kotId}_reprint.pdf`);
    } catch {
      onFailed(true);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleReprint()}
      disabled={reprint.isPending}
    >
      {reprint.isPending ? 'Reprinting…' : 'Reprint'}
    </Button>
  );
}

/**
 * One ticket, one row: `KOT 4 · BEVERAGE · Printed` with its one action at the end.
 *
 * READY prints, FAILED retries, and a ticket on paper reprints. A FAILED ticket offers Retry,
 * never Reprint: it has never reached paper, and `/cafe/kots/{id}/reprint` stamps the slip
 * REPRINT — telling a cook the food was already made, which is wrong there. Retry calls
 * `printKot` again via the same sequential queue.
 */
function KotTicketRow({
  kot,
  label,
  state,
  onRetry,
}: {
  kot: CafeKot;
  label: string;
  state: PrintState | 'SENT';
  onRetry: (kotId: string) => void;
}) {
  const [reprintFailed, setReprintFailed] = useState(false);
  const onPaper = state === 'PRINTED' || state === 'SENT';

  return (
    <Box as="li" border rounded="md" padding="sm">
      <Stack gap="xs" width="full">
        <Inline justify="between" align="center" width="full" gap="sm">
          <Text>{`KOT ${kot.kotNo} · ${kot.department} · ${label}`}</Text>
          {state === 'FAILED' || state === 'READY' ? (
            <Button type="button" variant="solid" size="sm" onClick={() => onRetry(kot.kotId)}>
              {state === 'READY' ? 'Print' : 'Retry'}
            </Button>
          ) : null}
          {onPaper ? <ReprintButton kotId={kot.kotId} onFailed={setReprintFailed} /> : null}
        </Inline>
        {reprintFailed ? (
          <Alert variant="danger" role="alert">
            Couldn&apos;t reprint this ticket. Try again.
          </Alert>
        ) : null}
      </Stack>
    </Box>
  );
}

export function KotTicketStrip({ tickets, earlier = [], onRetry }: KotTicketStripProps) {
  if (tickets.length === 0 && earlier.length === 0) return null;

  return (
    <Stack
      as="ul"
      gap="xs"
      margin="none"
      padding="none"
      width="full"
      className={surfaceChrome.listPlain}
    >
      {tickets.map(({ kot, state }) => (
        <KotTicketRow
          key={kot.kotId}
          kot={kot}
          label={STATE_LABEL[state]}
          state={state}
          onRetry={onRetry}
        />
      ))}
      {earlier.map((kot) => (
        <KotTicketRow key={kot.kotId} kot={kot} label="Sent" state="SENT" onRetry={onRetry} />
      ))}
    </Stack>
  );
}
