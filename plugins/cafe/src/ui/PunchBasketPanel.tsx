import {
  Box,
  Button,
  IconButton,
  Inline,
  Input,
  Stack,
  Text,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { Basket } from '../lib/punchBasket';

export interface PunchBasketPanelProps {
  basket: Basket;
  onQuantity: (ref: string, qty: number) => void;
  onNote: (ref: string, note: string) => void;
  onRemove: (ref: string) => void;
  onSend: () => void;
  sending: boolean;
}

/**
 * The basket for the round in progress. Disabling Send while `sending` is not
 * cosmetic: it stops the cashier manufacturing a double submit. The shared
 * idempotency key is the second line of defence, not the first.
 */
export function PunchBasketPanel({
  basket,
  onQuantity,
  onNote,
  onRemove,
  onSend,
  sending,
}: PunchBasketPanelProps) {
  return (
    <Stack gap="md" width="full">
      {basket.lines.length === 0 ? (
        <Text color="secondary" variant="caption">
          Pick items from the menu to build this round.
        </Text>
      ) : (
        <Stack
          as="ul"
          gap="sm"
          margin="none"
          padding="none"
          width="full"
          className={surfaceChrome.listPlain}
        >
          {basket.lines.map((line) => (
            <Box as="li" key={line.sellableRef} border rounded="md" padding="sm">
              <Stack gap="xs" width="full">
                <Inline justify="between" align="center" width="full" gap="sm">
                  <Text weight="semibold" truncate>
                    {line.name}
                  </Text>
                  <IconButton
                    size="sm"
                    label={`Remove ${line.name}`}
                    onClick={() => onRemove(line.sellableRef)}
                  >
                    ×
                  </IconButton>
                </Inline>
                <Inline gap="sm" align="center" width="full">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(e) =>
                      onQuantity(line.sellableRef, Math.max(1, Number(e.target.value) || 1))
                    }
                    aria-label={`Quantity for ${line.name}`}
                    className={productChrome.qtyInputNarrow}
                  />
                  <Input
                    value={line.note}
                    onChange={(e) => onNote(line.sellableRef, e.target.value)}
                    placeholder="Note for the kitchen (e.g. no onion)"
                    aria-label={`Note for ${line.name}`}
                  />
                </Inline>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Button
        type="button"
        variant="solid"
        fullWidth
        onClick={onSend}
        disabled={sending || basket.lines.length === 0}
      >
        {sending ? 'Sending…' : 'Send to kitchen'}
      </Button>
    </Stack>
  );
}
