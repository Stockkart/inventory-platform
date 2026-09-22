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

/**
 * What the cashier is told when a punch whose response was lost is replayed on mount.
 *
 * `freshCount` is what actually reached the printer, not what the server replayed: a ticket
 * already printed this session is deliberately not sent again (see the queued-id set in
 * `CafeKotBar`), and claiming paper that never came out is worse than saying nothing.
 */
export function resumedNotice(freshCount: number): PunchNotice {
  const tickets = `${freshCount} ticket${freshCount === 1 ? '' : 's'}`;
  return {
    tone: 'success',
    text:
      freshCount === 0
        ? 'Recovered an unfinished round: the kitchen had already taken it and its tickets have already printed here. Nothing was ordered twice.'
        : `Recovered an unfinished round: the kitchen had already taken it, so ${tickets} ${
            freshCount === 1 ? 'was' : 'were'
          } re-sent to the printer. Nothing was ordered twice.`,
  };
}

/**
 * A resume that fails is stated too. The round may already be with the kitchen — the key is
 * retained on a server or network error, so it stays resumable — and a cashier who is not
 * told simply presses Print KOT and risks a second round.
 */
export function resumeFailedNotice(error: unknown): PunchNotice {
  // The reason may or may not end in a full stop (an API message rarely does, the fallback
  // does); trim it so the sentence that follows reads as one rather than two.
  const reason = errorText(error).replace(/\.\s*$/, '');
  return {
    tone: 'danger',
    text: `Could not recover an unfinished round: ${reason}. The kitchen may already have it — check with them before sending it again.`,
  };
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
