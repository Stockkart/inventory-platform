import { useState } from 'react';
import {
  Box,
  Button,
  FormField,
  IconButton,
  Inline,
  Input,
  Select,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { menuSellableRef } from '@inventory-platform/product/types';
import type { MenuItem } from '../types/menu';
import type { CafeTab, CafeTabLineInput } from '../types/tab';

export interface CafeTabComposerProps {
  tab: CafeTab;
  menuItems: MenuItem[];
  /** True while a line write is in flight. */
  busy?: boolean;
  /** True while this tab's round is being sent to the kitchen. */
  sending?: boolean;
  onAddLine: (line: CafeTabLineInput) => void;
  onRemoveLine: (lineRef: string) => void;
  onPrint: () => void;
}

/**
 * Composes one tab's next round.
 *
 * Everything listed here is **unsent**. A tab never holds what the kitchen already has — that
 * lives on the bill — so there is no "already sent" section to render and no delta to compute
 * anywhere on this screen. The ten-minutes-later extra item is not a special case: the tab is
 * simply empty again, and one more line goes on it.
 */
export function CafeTabComposer({
  tab,
  menuItems,
  busy = false,
  sending = false,
  onAddLine,
  onRemoveLine,
  onPrint,
}: CafeTabComposerProps) {
  const [sellableRef, setSellableRef] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  const qty = Number(quantity);
  const canAdd = Boolean(sellableRef) && Number.isFinite(qty) && qty > 0 && !busy && !sending;

  const handleAdd = () => {
    if (!canAdd) return;
    onAddLine({
      sellableRef,
      quantity: qty,
      // Blank means no instruction, not an empty one — the ticket must not print a stray line.
      note: note.trim() ? note.trim() : null,
    });
    setSellableRef('');
    setQuantity('1');
    setNote('');
  };

  return (
    <Stack gap="md" padding="md" border rounded="md" bg="elevated" width="full">
      <Inline justify="between" align="center" gap="sm" width="full" flexWrap>
        <Text variant="heading3" weight="semibold">
          {`Token ${tab.tokenNo}`}
        </Text>
        <Text variant="caption" color="secondary">
          Not yet sent to the kitchen
        </Text>
      </Inline>

      <Inline gap="sm" align="end" flexWrap width="full">
        <FormField label="Menu item" htmlFor="cafe-tab-item">
          <Select
            id="cafe-tab-item"
            value={sellableRef}
            disabled={busy || sending}
            onChange={(e) => setSellableRef(e.target.value)}
            options={[
              { value: '', label: 'Choose an item' },
              ...menuItems.map((item) => ({
                value: menuSellableRef(item.id),
                label: item.name,
              })),
            ]}
          />
        </FormField>
        <FormField label="Quantity" htmlFor="cafe-tab-qty">
          <Input
            id="cafe-tab-qty"
            type="number"
            min={1}
            value={quantity}
            disabled={busy || sending}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>
        <FormField label="Preparation note" htmlFor="cafe-tab-note">
          <Input
            id="cafe-tab-note"
            value={note}
            placeholder="e.g. no onion"
            disabled={busy || sending}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
        <Button type="button" variant="solid" onClick={handleAdd} disabled={!canAdd}>
          Add to tab
        </Button>
      </Inline>

      {tab.lines.length === 0 ? (
        <Text color="muted">
          Nothing pending on this tab. Add the next round — the token stays the same.
        </Text>
      ) : (
        <Stack
          as="ul"
          gap="xs"
          margin="none"
          padding="none"
          width="full"
          className={surfaceChrome.listPlain}
          aria-label="Pending items"
        >
          {tab.lines.map((line) => (
            <Box as="li" key={line.lineRef} border rounded="md" padding="sm">
              <Inline justify="between" align="center" gap="sm" width="full">
                <Stack gap="none" align="start">
                  <Text>{`${line.quantity} × ${line.name}`}</Text>
                  {line.note ? (
                    <Text variant="caption" color="secondary">
                      {line.note}
                    </Text>
                  ) : null}
                </Stack>
                <IconButton
                  label={`Remove ${line.name}`}
                  title="Remove"
                  disabled={busy || sending}
                  onClick={() => onRemoveLine(line.lineRef)}
                >
                  ×
                </IconButton>
              </Inline>
            </Box>
          ))}
        </Stack>
      )}

      <Inline justify="end" width="full">
        <Button
          type="button"
          variant="solid"
          loading={sending}
          disabled={sending || busy || tab.lines.length === 0}
          onClick={onPrint}
        >
          {sending ? 'Sending…' : 'Print KOT'}
        </Button>
      </Inline>
    </Stack>
  );
}
