/**
 * "I agree" on a newer consent version for an already paired phone (R9.13). The consent screen
 * (task 13.1) calls this through its `onAgreeReconsent` seam when the launch gate opened it in
 * `reconsent` mode: `POST /consent {version}` then the agreed version is stored with the pairing
 * record, so the next launch goes straight to the home screen.
 *
 * Until this resolves with `agreed`, the app records no new punch (the navigator keeps the
 * consent screen in front of the home screen). "Don't agree" on re-consent is not an unpair: the
 * worker simply stays on the consent screen; a manager can unpair the phone from the employee page.
 *
 * Pure: no Expo or React Native import.
 */
import type { ConsentResponse } from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import { endPairingIf } from './pairingEnded';

export interface ReconsentClient {
  postConsent(version: number): Promise<ConsentResponse>;
}

export interface ReconsentStore {
  updateConsentVersion(version: number): Promise<void>;
  wipe(): Promise<void>;
}

export interface ReconsentDeps {
  client: ReconsentClient;
  pairingStore: ReconsentStore;
}

export type ReconsentResult =
  /** The server recorded the agreement; the home screen may open. */
  | { kind: 'agreed'; version: number }
  /** No answer (R6.1): nothing recorded; the screen offers Retry. */
  | { kind: 'not_reachable' }
  /** The pairing is over; the phone was wiped and the pairing screen must show `message`. */
  | { kind: 'not_paired'; message: string }
  /** The server refused for another reason; shown word for word. */
  | { kind: 'refused'; message: string };

export async function agreeReconsent(
  deps: ReconsentDeps,
  version: number,
): Promise<ReconsentResult> {
  try {
    const answer = await deps.client.postConsent(version);
    const agreed = Number.isInteger(answer.agreedVersion) ? answer.agreedVersion : version;
    await deps.pairingStore.updateConsentVersion(agreed);
    return { kind: 'agreed', version: agreed };
  } catch (error) {
    if (isNotReachable(error)) {
      return { kind: 'not_reachable' };
    }
    const ended = await endPairingIf(error, deps.pairingStore);
    if (ended) {
      return { kind: 'not_paired', message: ended.message };
    }
    if (isServerRefusal(error)) {
      return { kind: 'refused', message: error.message };
    }
    throw error;
  }
}
