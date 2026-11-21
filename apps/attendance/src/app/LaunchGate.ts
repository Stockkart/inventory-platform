/**
 * Where the app starts (R4.11 "pair → home → history → settings"; R5.9; R9.13):
 *
 * 1. No readable pairing record → **Pair**.
 * 2. Otherwise `GET /me` is asked once:
 *    - the server says the pairing is over, or the signing keys are gone or invalidated → the
 *      phone is wiped (`endPairingIf`) → **Pair**, with the message to show (R3.3, R5.9, design
 *      `KEY_INVALIDATED` text);
 *    - `consent.reconsentRequired` → **Consent** in `reconsent` mode for `consent.latestVersion`,
 *      with that version's text from `GET /consent/latest`; the navigator shows that screen first
 *      and the app records no new punch until "I agree" (R9.13; already-waiting offline punches
 *      are still sent by the sync worker). "I agree" runs `agreeReconsent` (`./reconsent.ts`);
 *    - any other answer or no answer → **Home**. When the server was not reachable the home
 *      screen gets `offline: true` and works from the last stored state (R6).
 *
 * The gate never decides anything about the shop switch itself (design DD13): `biometricApp` is
 * read by the home screen from the same `/me` answer, and by the server on every punch.
 *
 * Pure: no Expo, React or React Native import. `useLaunchGate` (`./useLaunchGate.ts`) runs it
 * once for the navigator.
 */
import type {
  AppLocationSettings,
  AppStatusResponse,
  ConsentVersion,
} from '@inventory-platform/attendance-protocol';

import { isNotReachable } from '../api/appClient';
import type { PairingRecord } from '../state/pairingStore';
import { endPairingIf, type PairingEndReason } from './pairingEnded';

/** The part of `PairingStore` the gate needs. */
export interface LaunchPairingStore {
  load(): Promise<PairingRecord | null>;
  wipe(): Promise<void>;
  /** Keeps the Location check settings current from the `/me` answer (R9.3). Optional. */
  updateLocation?(location: AppLocationSettings): Promise<void>;
}

/** The part of `AppClient` the gate needs. */
export interface LaunchClient {
  getMe(): Promise<AppStatusResponse>;
  /** The text of the newest consent version, shown by the re-consent screen (R9.12–R9.13). */
  getLatestConsent(): Promise<ConsentVersion>;
}

export interface LaunchGateDeps {
  pairingStore: LaunchPairingStore;
  client: LaunchClient;
}

/** Where the navigator starts, with what each screen needs to know. */
export type LaunchRoute =
  | {
      name: 'Pair';
      /** Why the phone is on the pairing screen again, when it was paired before. */
      reason?: PairingEndReason;
      /** Plain words shown above the code entry, when `reason` is set. */
      message?: string;
    }
  | {
      name: 'Consent';
      mode: 'reconsent';
      /** The `RECONSENT_REQUIRED` version the worker must agree to (R9.13). */
      version: number;
      /**
       * That version's text, for the consent screen. Null when `GET /consent/latest` gave no
       * answer: the navigator must still not open Home (R9.13 "records no new punches until the
       * worker taps I agree"); it shows a retry notice and runs the gate again.
       */
      consent: ConsentVersion | null;
      pairing: PairingRecord;
    }
  | {
      name: 'Home';
      pairing: PairingRecord;
      /** The `/me` answer when the server answered; null when it did not. */
      status: AppStatusResponse | null;
      /** True when the server was not reachable (R6.1); the home screen starts in offline mode. */
      offline: boolean;
    };

export async function resolveLaunchRoute(deps: LaunchGateDeps): Promise<LaunchRoute> {
  const pairing = await deps.pairingStore.load();
  if (pairing == null) {
    return { name: 'Pair' };
  }

  let status: AppStatusResponse;
  try {
    status = await deps.client.getMe();
  } catch (error) {
    const ended = await endPairingIf(error, deps.pairingStore);
    if (ended) {
      return { name: 'Pair', reason: ended.reason, message: ended.message };
    }
    // Not reachable, a refusal the home screen shows itself, or an unexpected failure: the home
    // screen owns the next `/me` read and its own error state.
    return { name: 'Home', pairing, status: null, offline: isNotReachable(error) };
  }

  const current = await rememberLocation(deps.pairingStore, pairing, status.location);

  if (status.consent.reconsentRequired) {
    return {
      name: 'Consent',
      mode: 'reconsent',
      version: status.consent.latestVersion,
      consent: await latestConsent(deps.client),
      pairing: current,
    };
  }
  return { name: 'Home', pairing: current, status, offline: false };
}

/** The newest consent text (R9.13), or null when the server gave no answer for it. */
async function latestConsent(client: LaunchClient): Promise<ConsentVersion | null> {
  try {
    return await client.getLatestConsent();
  } catch {
    return null;
  }
}

/** Stores the Location check settings the server just sent (R9.3); a store failure is not fatal. */
async function rememberLocation(
  store: LaunchPairingStore,
  pairing: PairingRecord,
  location: AppLocationSettings,
): Promise<PairingRecord> {
  if (!store.updateLocation) {
    return { ...pairing, location };
  }
  try {
    await store.updateLocation(location);
  } catch {
    // The next `/me` read refreshes it; the screen uses the value from this answer meanwhile.
  }
  return { ...pairing, location };
}
