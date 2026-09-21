import type { PunchBody } from '../types/order';

export interface BasketLine {
  sellableRef: string;
  name: string;
  quantity: number;
  note: string;
}

export interface Basket {
  key: string;
  lines: BasketLine[];
}

export type PunchOutcome = 'SUCCESS' | 'REJECTED' | 'SERVER_ERROR' | 'NETWORK_ERROR';

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBasket(): Basket {
  return { key: newKey(), lines: [] };
}

export function addLine(basket: Basket, item: { sellableRef: string; name: string }): Basket {
  const existing = basket.lines.find((l) => l.sellableRef === item.sellableRef);
  if (existing) {
    return setQuantity(basket, item.sellableRef, existing.quantity + 1);
  }
  return {
    ...basket,
    lines: [...basket.lines, { ...item, quantity: 1, note: '' }],
  };
}

export function setQuantity(basket: Basket, sellableRef: string, quantity: number): Basket {
  return {
    ...basket,
    lines: basket.lines.map((l) => (l.sellableRef === sellableRef ? { ...l, quantity } : l)),
  };
}

export function setNote(basket: Basket, sellableRef: string, note: string): Basket {
  return {
    ...basket,
    lines: basket.lines.map((l) => (l.sellableRef === sellableRef ? { ...l, note } : l)),
  };
}

export function removeLine(basket: Basket, sellableRef: string): Basket {
  return { ...basket, lines: basket.lines.filter((l) => l.sellableRef !== sellableRef) };
}

export function toPunchBody(basket: Basket): PunchBody {
  return {
    lines: basket.lines.map((l) => {
      const note = l.note.trim();
      return { sellableRef: l.sellableRef, quantity: l.quantity, ...(note ? { note } : {}) };
    }),
  };
}

/**
 * Whether to keep the idempotency key after a punch attempt.
 *
 * Retaining a key after a permanent rejection strands the basket behind a request that
 * can never succeed. Discarding one after a timeout is the dangerous direction: the
 * punch may well have been recorded, and a fresh key would cook the round twice.
 */
export function keyAfter(outcome: PunchOutcome, key: string): string | null {
  switch (outcome) {
    case 'SUCCESS':
    case 'REJECTED':
      return null;
    case 'SERVER_ERROR':
    case 'NETWORK_ERROR':
      return key;
  }
}
