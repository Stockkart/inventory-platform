import { useMemo, useState } from 'react';
import type { InventoryItem } from '@inventory-platform/product/types';
import { Alert, Button, Inline, Input, Modal, Stack, Text } from '@inventory-platform/ui-kit';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

function lotPrice(lot: InventoryItem): number {
  return lot.sellingPrice ?? lot.priceToRetail ?? 0;
}

function lotStock(lot: InventoryItem): number {
  return lot.currentBaseCount ?? lot.currentCount ?? 0;
}

export interface StockItemPickerProps {
  open: boolean;
  /** Sell-direct lots, as the sell screen sees them. */
  lots: InventoryItem[];
  /** Lots already placed somewhere in the menu; a lot is placed once. */
  linkedIds: Set<string>;
  loadError?: string | null;
  onPick: (lot: InventoryItem) => void;
  onClose: () => void;
}

/** Choose a sell-direct stock item to place in a section. Price and stock are shown, never edited. */
export function StockItemPicker({
  open,
  lots,
  linkedIds,
  loadError,
  onPick,
  onClose,
}: StockItemPickerProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const offered = useMemo(
    () =>
      lots.filter(
        (lot) =>
          lot.name?.trim() && !linkedIds.has(lot.id) && (!q || lot.name.toLowerCase().includes(q)),
      ),
    [lots, linkedIds, q],
  );

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header title="Add stock item" />
      <Modal.Body>
        <Stack gap="sm">
          {loadError ? <Alert variant="danger">{loadError}</Alert> : null}
          <Input
            value={query}
            placeholder="Search stock items"
            aria-label="Search stock items"
            onChange={(e) => setQuery(e.target.value)}
          />
          {offered.length === 0 ? (
            <Text variant="caption" color="secondary">
              {lots.length === 0
                ? 'No stock items are marked "Sell directly" yet.'
                : 'Every matching stock item is already in the menu.'}
            </Text>
          ) : (
            offered.map((lot) => (
              <Button key={lot.id} type="button" variant="outline" onClick={() => onPick(lot)}>
                <Inline justify="between" align="center" width="full" gap="md">
                  <Text weight="semibold">{lot.name}</Text>
                  <Text variant="caption" color="secondary">
                    {money(lotPrice(lot))} · {lotStock(lot)} in stock
                  </Text>
                </Inline>
              </Button>
            ))
          )}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
