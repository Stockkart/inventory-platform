import type { PrintState } from './printQueue';
import type { CafeKot } from '../types/kot';

export interface KotTicketView {
  kot: CafeKot;
  state: PrintState;
}

export type NoticeTone = 'info' | 'success' | 'danger';

export interface PunchNotice {
  tone: NoticeTone;
  text: string;
}

/**
 * What the cashier is told after a punch resolves.
 *
 * An empty ticket list is the server saying the kitchen already has everything on
 * this order — a legitimate no-op, not a failure. Saying nothing at all would read
 * as a dead button and have the cashier press it again, so it gets its own plainly
 * worded line.
 */
export function punchedNotice(tickets: CafeKot[]): PunchNotice {
  if (tickets.length === 0) {
    return {
      tone: 'info',
      text: 'Nothing new to send — the kitchen already has every item on this order.',
    };
  }
  const count = tickets.length;
  return {
    tone: 'success',
    text: `Sent ${count} kitchen ticket${count === 1 ? '' : 's'}. Printing…`,
  };
}

/**
 * A failed punch is an order the kitchen never sees, so it is stated outright
 * rather than swallowed. The idempotency key is retained across a server or network
 * error (see `keyAfter`), so pressing Print KOT again is safe.
 */
export function punchFailedNotice(error: unknown): PunchNotice {
  return { tone: 'danger', text: `Could not send to the kitchen: ${errorText(error)}` };
}

function errorText(error: unknown): string {
  const response = (error as { response?: { data?: { message?: unknown } } })?.response;
  const apiMessage = response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'the request did not complete. Nothing was sent — press Print KOT to try again.';
}

/** Appends newly punched tickets, skipping any id already on the strip. */
export function appendTickets(existing: KotTicketView[], incoming: CafeKot[]): KotTicketView[] {
  const known = new Set(existing.map((entry) => entry.kot.kotId));
  const added = incoming
    .filter((kot) => !known.has(kot.kotId))
    .map((kot) => ({ kot, state: 'QUEUED' as PrintState }));
  return added.length === 0 ? existing : [...existing, ...added];
}

/** Moves one ticket to a new print state, leaving the rest untouched. */
export function withTicketState(
  tickets: KotTicketView[],
  kotId: string,
  state: PrintState,
): KotTicketView[] {
  return tickets.map((entry) => (entry.kot.kotId === kotId ? { ...entry, state } : entry));
}
