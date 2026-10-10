import { describe, expect, it } from 'vitest';
import { appendTickets, punchFailedNotice, punchedNotice, withTicketState } from './kotBarState';
import type { CafeKot } from '../types/kot';

const kot = (kotId: string): CafeKot => ({
  kotId,
  shopId: 'shop-1',
  purchaseId: 'p-1',
  kotNo: 7,
  department: 'KITCHEN',
  roundNo: 1,
  kind: 'ISSUE',
  lines: [],
});

describe('punchedNotice', () => {
  it('tells the cashier a no-op punch created nothing, without looking like a failure', () => {
    const notice = punchedNotice([]);
    expect(notice.tone).toBe('info');
    expect(notice.text).toContain('Nothing new to send');
  });

  it('reports how many tickets were created', () => {
    expect(punchedNotice([kot('a')]).text).toContain('1 kitchen ticket.');
    expect(punchedNotice([kot('a'), kot('b')]).text).toContain('2 kitchen tickets');
  });
});

describe('punchFailedNotice', () => {
  it('prefers the API message', () => {
    const notice = punchFailedNotice({ response: { data: { message: 'cart is empty' } } });
    expect(notice.tone).toBe('danger');
    expect(notice.text).toContain('cart is empty');
  });

  it('falls back to the Error message', () => {
    expect(punchFailedNotice(new Error('Network Error')).text).toContain('Network Error');
  });

  it('never renders an empty reason', () => {
    expect(punchFailedNotice({}).text).toContain('press Print KOT to try again');
  });
});

describe('appendTickets', () => {
  // One popup per user gesture: opening every ticket under the single press that made them
  // got all but the first blocked, and a blocked one silently became a download.
  it('queues only the first ticket, and leaves the rest for a press of their own', () => {
    const next = appendTickets([], [kot('a'), kot('b'), kot('c')]);
    expect(next.map((entry) => entry.kot.kotId)).toEqual(['a', 'b', 'c']);
    expect(next.map((entry) => entry.state)).toEqual(['QUEUED', 'READY', 'READY']);
  });

  it('queues a lone ticket, so the common one-station round still needs no extra press', () => {
    expect(appendTickets([], [kot('a')])[0].state).toBe('QUEUED');
  });

  it('does not re-add a ticket already on the strip, so a replayed punch cannot duplicate a row', () => {
    const first = appendTickets([], [kot('a')]);
    const printed = withTicketState(first, 'a', 'PRINTED');
    expect(appendTickets(printed, [kot('a')])).toBe(printed);
  });
});

describe('withTicketState', () => {
  it('updates only the named ticket', () => {
    const tickets = appendTickets([], [kot('a'), kot('b')]);
    const next = withTicketState(tickets, 'b', 'FAILED');
    expect(next[0].state).toBe('QUEUED');
    expect(next[1].state).toBe('FAILED');
  });

  it('ignores an unknown id rather than throwing inside the queue listener', () => {
    const tickets = appendTickets([], [kot('a')]);
    expect(withTicketState(tickets, 'zzz', 'PRINTED')[0].state).toBe('QUEUED');
  });
});
