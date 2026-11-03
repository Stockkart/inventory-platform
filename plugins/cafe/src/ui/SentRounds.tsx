import { useState } from 'react';
import { openPdfPreview } from '@inventory-platform/product/print';
import {
  Alert,
  Badge,
  Box,
  Button,
  Inline,
  Spinner,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useBillKotsQuery, useReprintKotMutation } from '../queries/hooks';
import type { CafeKot } from '../types/kot';

/** `7:42 PM`, or nothing at all for a ticket issued before createdAt was recorded. */
function issuedAt(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** `Malai Chaap ×2, Butter Naan ×4` — what the cashier matches against what the cook is asking for. */
function summarise(lines: CafeKot['lines']): string {
  if (!lines || lines.length === 0) return 'No items';
  return lines.map((line) => `${line.name} ×${line.quantity}`).join(', ');
}

/**
 * One already-sent round.
 *
 * Owns its own reprint mutation rather than taking a shared one from the list: the hook is keyed
 * by ticket id, and that key is what keeps a retried reprint of *this* slip from being replayed
 * onto a different one.
 */
function SentRound({ kot }: { kot: CafeKot }) {
  const reprint = useReprintKotMutation(kot.kotId);
  const [failed, setFailed] = useState(false);
  const time = issuedAt(kot.createdAt);
  const reprints = Number(kot.reprintCount ?? 0);

  const handleReprint = async () => {
    setFailed(false);
    try {
      // The blob IS the stamped slip. Fetching the document again afterwards would hand the cook
      // an unstamped one, which reads as a fresh order for food already being made.
      const blob = await reprint.mutateAsync();
      openPdfPreview(blob, `kot_${kot.kotId}_reprint.pdf`);
    } catch {
      setFailed(true);
    }
  };

  return (
    <Box as="li" border rounded="md" padding="sm">
      <Stack gap="xs" width="full">
        <Inline gap="sm" align="center" flexWrap>
          <Text as="span">{`KOT ${kot.kotNo}`}</Text>
          {time ? (
            <Text as="span" variant="caption" color="secondary">
              {time}
            </Text>
          ) : null}
          <Badge variant="neutral">{kot.department}</Badge>
          {kot.kind === 'CANCEL' ? <Badge variant="danger">Cancellation</Badge> : null}
        </Inline>
        <Text variant="caption" color="secondary">
          {summarise(kot.lines)}
        </Text>
        <Inline justify="between" align="center" width="full" gap="sm">
          {/* Visible so a second cashier can see the slip already went out, rather than sending a
              third one because the kitchen has not walked back yet. */}
          <Text as="span" variant="caption" color="muted">
            {reprints > 0 ? `Reprinted ×${reprints}` : ''}
          </Text>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleReprint()}
            disabled={reprint.isPending}
          >
            {reprint.isPending ? 'Reprinting…' : 'Reprint'}
          </Button>
        </Inline>
        {failed ? (
          <Alert variant="danger" role="alert">
            Couldn&apos;t reprint this ticket. Try again.
          </Alert>
        ) : null}
      </Stack>
    </Box>
  );
}

export interface SentRoundsProps {
  purchaseId: string | null;
}

/**
 * The rounds this bill has already sent, and the only way back to one.
 *
 * `CafeKotBar`'s own ticket list is component state — it dies when the bar unmounts, which is
 * every cart switch and every reload. So a slip lost in the kitchen (jammed roll, blocked popup,
 * a cook who put it down) has no recovery path without this: pressing Print KOT again correctly
 * sends nothing, because the cart owes the kitchen nothing.
 *
 * Collapsed by default. The common shift never opens it, and the order column is narrow enough
 * that an always-open list would push the cart itself off the screen.
 */
export function SentRounds({ purchaseId }: SentRoundsProps) {
  const [open, setOpen] = useState(false);
  const query = useBillKotsQuery(open ? purchaseId : null);
  const rounds = query.data ?? [];

  if (!purchaseId) return null;

  return (
    <Box px="md" pb="md" width="full">
      <Stack gap="xs" width="full">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          {open ? 'Hide sent rounds' : 'Sent rounds'}
        </Button>

        {open && query.isPending ? <Spinner /> : null}

        {open && query.isError ? (
          <Alert variant="danger" role="alert">
            Couldn&apos;t load the rounds already sent. Try again.
          </Alert>
        ) : null}

        {open && !query.isPending && !query.isError && rounds.length === 0 ? (
          <Text variant="caption" color="secondary">
            Nothing has been sent to the kitchen yet.
          </Text>
        ) : null}

        {open && rounds.length > 0 ? (
          <Stack
            as="ul"
            gap="xs"
            margin="none"
            padding="none"
            width="full"
            className={surfaceChrome.listPlain}
          >
            {rounds.map((kot) => (
              <SentRound key={kot.kotId} kot={kot} />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

export default SentRounds;
