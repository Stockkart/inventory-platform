/** Encoded sellable identity: {@code kind:id} */

export const SELLABLE_KIND_INVENTORY = 'inventory';
export const SELLABLE_KIND_MENU = 'menu';

export function encodeSellableRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}

export function menuSellableRef(menuItemId: string): string {
  return encodeSellableRef(SELLABLE_KIND_MENU, menuItemId);
}

export function inventorySellableRef(lotId: string): string {
  return encodeSellableRef(SELLABLE_KIND_INVENTORY, lotId);
}

export function parseSellableRef(
  encoded: string | null | undefined
): { kind: string; id: string } | null {
  if (!encoded?.trim()) return null;
  const sep = encoded.indexOf(':');
  if (sep <= 0 || sep >= encoded.length - 1) return null;
  return {
    kind: encoded.slice(0, sep),
    id: encoded.slice(sep + 1),
  };
}

export function menuItemIdFromSellableRef(
  encoded: string | null | undefined
): string | null {
  const parsed = parseSellableRef(encoded);
  return parsed?.kind === SELLABLE_KIND_MENU ? parsed.id : null;
}

export function inventoryLotIdFromSellableRef(
  encoded: string | null | undefined
): string | null {
  const parsed = parseSellableRef(encoded);
  return parsed?.kind === SELLABLE_KIND_INVENTORY ? parsed.id : null;
}

export function lineSellableRef(line: {
  sellableRef?: string | null;
  menuItemId?: string | null;
  inventoryId?: string | null;
  id?: string | null;
}): string | null {
  if (line.sellableRef?.trim()) return line.sellableRef.trim();
  if (line.menuItemId?.trim()) return menuSellableRef(line.menuItemId);
  const lot = line.inventoryId?.trim() ?? line.id?.trim();
  if (lot) return inventorySellableRef(lot);
  return null;
}
