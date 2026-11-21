/** Encoded sellable identity: {@code kind:id} */

export const SELLABLE_KIND_INVENTORY = 'inventory';
export const SELLABLE_KIND_MENU = 'menu';

export function encodeSellableRef(kind: string, id: string): string {
  return `${kind}:${id}`;
}

/**
 * A menu item's sellable ref, optionally carrying the chosen portion: `menu:<itemId>@<rateId>`.
 *
 * The portion rides inside the ref rather than beside it so that the cart, which keys lines by
 * ref, gives Half and Full of one dish two separate lines without any further arrangement. Only
 * the frozen rate id travels — never the portion's display name, and never its price.
 */
export function menuSellableRef(menuItemId: string, rateId?: string | null): string {
  const rate = rateId?.trim();
  return encodeSellableRef(SELLABLE_KIND_MENU, rate ? `${menuItemId}@${rate}` : menuItemId);
}

export function inventorySellableRef(lotId: string): string {
  return encodeSellableRef(SELLABLE_KIND_INVENTORY, lotId);
}

export function parseSellableRef(
  encoded: string | null | undefined,
): { kind: string; id: string } | null {
  if (!encoded?.trim()) return null;
  const sep = encoded.indexOf(':');
  if (sep <= 0 || sep >= encoded.length - 1) return null;
  return {
    kind: encoded.slice(0, sep),
    id: encoded.slice(sep + 1),
  };
}

export function menuItemIdFromSellableRef(encoded: string | null | undefined): string | null {
  const parsed = parseSellableRef(encoded);
  if (parsed?.kind !== SELLABLE_KIND_MENU) return null;
  const at = parsed.id.indexOf('@');
  return at > 0 ? parsed.id.slice(0, at) : parsed.id;
}

/** The chosen portion's frozen id, or null for an unportioned menu ref. */
export function menuRateIdFromSellableRef(encoded: string | null | undefined): string | null {
  const parsed = parseSellableRef(encoded);
  if (parsed?.kind !== SELLABLE_KIND_MENU) return null;
  const at = parsed.id.indexOf('@');
  if (at <= 0 || at >= parsed.id.length - 1) return null;
  return parsed.id.slice(at + 1);
}

export function inventoryLotIdFromSellableRef(encoded: string | null | undefined): string | null {
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
