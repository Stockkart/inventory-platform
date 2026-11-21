/**
 * What the history screen does on every open (R4.10): read the worker's own punches of the last 31
 * calendar days from the server, newest first, and replace the display cache with the answer.
 * When the server is not reachable (R6.1) the cached copy is shown instead, pruned to the window.
 *
 * Pure: the screen renders the {@link HistoryLoad} this returns; tests call it with a stub client
 * and a `MemoryDatabase`-backed cache.
 */
import type { PunchResponse } from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import { pairingEndedBy } from '../app/pairingEnded';
import { HistoryCache, toHistoryEntries, type HistoryEntry } from './HistoryCache';
import { historyWindow } from './kolkataDates';

/** The slice of `AppClient` the history screen uses. */
export interface HistoryClient {
  getPunches(from: string, to: string): Promise<PunchResponse[]>;
}

export interface HistoryDeps {
  client: HistoryClient;
  cache: HistoryCache;
  /** Phone clock in epoch ms; `Date.now` on the phone. */
  now?: () => number;
}

export type HistoryLoad =
  /** The server answered; the cache now equals `entries`. */
  | { kind: 'server'; entries: HistoryEntry[]; from: string; to: string }
  /** The server was not reachable; `entries` is the cached copy. */
  | { kind: 'cache'; entries: HistoryEntry[]; from: string; to: string }
  /**
   * The pairing has ended (`HR_APP_NOT_PAIRED`, no pairing record, or the signing keys are gone
   * or invalidated): the caller wipes and shows the pairing screen with `message` (R3.2–R3.3,
   * R5.9). The text is the one `pairingEndedBy` chose, so every screen says the same thing.
   */
  | { kind: 'not_paired'; message: string }
  /** Another server refusal; the cached copy is shown with the server's message. */
  | { kind: 'refused'; message: string; entries: HistoryEntry[]; from: string; to: string };

export async function loadHistory(deps: HistoryDeps): Promise<HistoryLoad> {
  const now = deps.now ?? Date.now;
  const { from, to } = historyWindow(now());
  try {
    const punches = await deps.client.getPunches(from, to);
    const entries = await deps.cache.replaceAll(toHistoryEntries(punches), from);
    return { kind: 'server', entries, from, to };
  } catch (error) {
    if (isNotReachable(error)) {
      await deps.cache.prune(from);
      return { kind: 'cache', entries: await deps.cache.list(), from, to };
    }
    const ended = pairingEndedBy(error);
    if (ended) {
      return { kind: 'not_paired', message: ended.message };
    }
    if (isServerRefusal(error)) {
      await deps.cache.prune(from);
      return {
        kind: 'refused',
        message: error.message,
        entries: await deps.cache.list(),
        from,
        to,
      };
    }
    throw error;
  }
}
