/**
 * "Remove this phone" on the settings screen (R3.7–R3.9): the worker unpairs their own phone.
 *
 * - The server must answer (R3.8): `POST /pairings/me/unpair` first, `wipe()` only after the
 *   server has marked the pairing unpaired. When the server is not reachable (R6.1) nothing is
 *   deleted, the phone stays paired, and the screen shows `UNPAIR_NEEDS_NETWORK`.
 * - A `HR_APP_NOT_PAIRED` answer means the server already ended this pairing (a manager unpaired
 *   or replaced the phone first): the phone is wiped as on any such answer (R3.2–R3.3).
 * - Any other refusal (for example the rate limit) keeps the data and shows the server's text.
 *
 * The confirmation question ("Remove this phone?") is the screen's job; this function runs after
 * the worker confirmed. Pure: no Expo or React Native import.
 */
import { UNPAIR_NEEDS_NETWORK } from '@inventory-platform/attendance-protocol';
import type { UnpairResponse } from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import { endPairingIf } from '../app/pairingEnded';

export interface RemovePhoneClient {
  unpairMe(): Promise<UnpairResponse>;
}

export interface RemovePhoneStore {
  wipe(): Promise<void>;
}

export interface RemovePhoneDeps {
  client: RemovePhoneClient;
  pairingStore: RemovePhoneStore;
}

export type RemovePhoneResult =
  /** The server unpaired the phone and the phone is clean; show the pairing screen (R3.7). */
  | { kind: 'unpaired'; wipeError?: unknown }
  /** The server could not be reached; nothing changed (R3.8). `message` is `UNPAIR_NEEDS_NETWORK`. */
  | { kind: 'not_reachable'; message: string }
  /** The server refused for a reason other than "not paired"; nothing changed. */
  | { kind: 'failed'; message: string };

export async function removePhone(deps: RemovePhoneDeps): Promise<RemovePhoneResult> {
  try {
    await deps.client.unpairMe();
  } catch (error) {
    if (isNotReachable(error)) {
      return { kind: 'not_reachable', message: UNPAIR_NEEDS_NETWORK };
    }
    const ended = await endPairingIf(error, deps.pairingStore);
    if (ended) {
      return ended.wipeError === undefined
        ? { kind: 'unpaired' }
        : { kind: 'unpaired', wipeError: ended.wipeError };
    }
    if (isServerRefusal(error)) {
      return { kind: 'failed', message: error.message };
    }
    throw error;
  }
  try {
    await deps.pairingStore.wipe();
    return { kind: 'unpaired' };
  } catch (wipeError) {
    // The server side is done; the pairing screen must show even if a local step failed.
    return { kind: 'unpaired', wipeError };
  }
}
