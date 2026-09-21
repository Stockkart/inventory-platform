import { Box, Button, Inline, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import type { PrintState } from '../lib/printQueue';
import type { CafeKot } from '../types/kot';

export interface KotTicketStripProps {
  tickets: Array<{ kot: CafeKot; state: PrintState }>;
  onRetry: (kotId: string) => void;
}

const STATE_LABEL: Record<PrintState, string> = {
  QUEUED: 'Queued',
  PRINTING: 'Printing…',
  PRINTED: 'Printed',
  FAILED: 'Failed',
};

/**
 * One row per kitchen ticket issued this screen. A FAILED ticket offers
 * Retry, never Reprint: the ticket has never reached paper, and
 * `/cafe/kots/{id}/reprint` stamps the slip REPRINT — telling a cook the
 * food was already made, which is wrong here. Retry calls `printKot` again
 * via the same sequential queue.
 */
export function KotTicketStrip({ tickets, onRetry }: KotTicketStripProps) {
  if (tickets.length === 0) return null;

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
        <Box as="li" key={kot.kotId} border rounded="md" padding="sm">
          <Inline justify="between" align="center" width="full" gap="sm">
            <Text>{`KOT ${kot.kotNo} · ${kot.department} · ${STATE_LABEL[state]}`}</Text>
            {state === 'FAILED' ? (
              <Button type="button" variant="solid" size="sm" onClick={() => onRetry(kot.kotId)}>
                Retry
              </Button>
            ) : null}
          </Inline>
        </Box>
      ))}
    </Stack>
  );
}
