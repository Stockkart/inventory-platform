/**
 * The one place that decides "this pairing is over, wipe the phone" (R3.3, R5.9, R9.6, design
 * "App-side rules": `wipe()` is the response to `HR_APP_NOT_PAIRED` and to `KEY_INVALIDATED`).
 *
 * Three errors end a pairing from the app's point of view:
 *
 * | Error                                   | Meaning                                                            | Text shown                  |
 * | --------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
 * | `ServerRefusal` with `HR_APP_NOT_PAIRED` | the server unpaired or replaced this phone (R3.2)                 | the server's text (+ R7.10) |
 * | `BiometricSignerError` `KEY_INVALIDATED` | the phone's biometric enrolment changed, the punch key is dead     | `KEY_INVALIDATED` (design)  |
 * | `BiometricSignerError` `NO_KEYS`, `NoPairing` | the keys or the record are gone (data cleared, R5.9)         | `PHONE_REPLACED` wording    |
 *
 * {@link endPairingIf} checks an error against that table and, when it matches, runs `wipe()` and
 * returns the message for the pairing screen; otherwise it returns null and the caller handles the
 * error itself. Every screen and the sync worker call it so the rule is written once.
 *
 * Pure: no Expo or React Native import.
 */
import { KEY_INVALIDATED, PHONE_REPLACED } from '@inventory-platform/attendance-protocol';

import { NoPairing, isServerRefusal } from '../api/appClient';
import { isBiometricSignerError } from '../signer/BiometricSigner';

/** The part of `PairingStore` this module needs. */
export interface Wiper {
  wipe(): Promise<void>;
}

/** Why the pairing ended, for the pairing screen and for logging; never shown as is. */
export type PairingEndReason = 'NOT_PAIRED' | 'KEY_INVALIDATED' | 'NO_KEYS';

export interface PairingEnded {
  reason: PairingEndReason;
  /** Plain words for the pairing screen. */
  message: string;
}

/**
 * Classifies `error`. Returns the reason and the text to show when the error means the pairing is
 * over, else null. Does not wipe; see {@link endPairingIf}.
 */
export function pairingEndedBy(error: unknown): PairingEnded | null {
  if (isServerRefusal(error) && error.notPaired) {
    return { reason: 'NOT_PAIRED', message: error.message };
  }
  if (isBiometricSignerError(error, 'KEY_INVALIDATED')) {
    return { reason: 'KEY_INVALIDATED', message: KEY_INVALIDATED };
  }
  if (isBiometricSignerError(error, 'NO_KEYS') || error instanceof NoPairing) {
    return { reason: 'NO_KEYS', message: PHONE_REPLACED };
  }
  return null;
}

/**
 * When `error` ends the pairing, wipes everything the pairing left on the phone (R9.6) and returns
 * what the pairing screen should say; otherwise returns null without touching anything. A failing
 * wipe is still reported as ended (the record may be half gone) with the wipe error attached, so
 * the caller shows the pairing screen either way.
 */
export async function endPairingIf(
  error: unknown,
  store: Wiper,
): Promise<(PairingEnded & { wipeError?: unknown }) | null> {
  const ended = pairingEndedBy(error);
  if (!ended) {
    return null;
  }
  try {
    await store.wipe();
    return ended;
  } catch (wipeError) {
    return { ...ended, wipeError };
  }
}
