/**
 * `PunchFlow`: what happens between the worker's tap on **Check in / Check out** and the
 * confirmation, refusal or "saved on your phone" the home screen shows (design "Attendance app"
 * table, `PunchFlow`; R4.2, R4.3, R4.7–R4.9, R5.5, R6.1–R6.3, R7.10). The steps run in this order
 * and stop at the first that fails:
 *
 * 0. **Reachability** (R6.1): {@link Reachability.probe} decides whether the server is reachable
 *    right now (the phone's network report, then `GET /me` with the 10 s timeout). The answer picks
 *    the `offline` flag of the one payload this tap signs; see "Why the probe comes first" below.
 * 1. **Location** (R4.2a), only when the shop's Location check was on as the app last received it
 *    (`pairingStore.load().location.locationCheck`, the same rule online and offline, R6.2):
 *    `LocationReader.read(15 s)` → distance, accuracy and the mock flag, or `'NO_LOCATION'`. The
 *    flow continues either way; the server applies the no-location rule (R4.5). Coordinates never
 *    reach this module (R9.2).
 * 2. **Biometric** (R4.2b): the canonical punch payload (`SKAT-PUNCH-1`, a fresh UUID v4 `punchId`,
 *    `phoneTime` = the phone clock in UTC whole seconds, `offline` from step 0) is signed by the
 *    punch key, which raises the phone's strong biometric prompt. A failed, cancelled or locked-out
 *    check stores nothing, sends nothing and answers {@link PunchResult} `biometric_required` with
 *    the R5.5 sentence (R4.2d, R6.2).
 * 3. **Send or save** (R4.2c, R6.2):
 *    - reachable → `POST /punches`. A stored punch answers `stored` with the lines the screen
 *      shows: "Checked in at 09:12" (server time, R4.4, R4.7), one sentence per flag (R4.7) and
 *      the duplicate line when the server marked it a duplicate (R4.8). The server decides the
 *      direction (R4.9); the flow sends none. A refusal answers `refused` with the server's message
 *      word for word (R4.3, R7.10). `HR_APP_NOT_PAIRED` wipes the phone first and answers
 *      `unpaired` (R3.2–R3.3).
 *    - not reachable → the signed request (`offline = 1`) is saved to the {@link PunchQueue} with
 *      the direction the home screen guessed (R6.4), `onQueued` wakes the sync worker, and the
 *      answer is `queued` with `SAVED_OFFLINE` (R6.3). No request is made.
 *
 * **Why the probe comes first.** R6.2 says the offline path runs the same steps and saves the
 * *signed* punch; the signed bytes must say `offline = 1` so the server stores the phone's time and
 * the "Recorded offline" flag (R6.8–R6.9). The punch key signs once per biometric prompt (design
 * DD4: per-use authentication), so there is no way to sign an `offline = 1` payload after an
 * `offline = 0` send has failed without a second prompt. Asking "is the server there?" before the
 * prompt costs one cheap request and keeps one prompt per tap. (Alternatives rejected: a second
 * prompt after the failed send, bad for the worker; signing both payloads in one prompt, which the
 * Android per-use key does not allow.)
 *
 * **Edge: the probe said reachable, the send then failed.** The payload was signed `offline = 0`
 * and the biometric check has passed, so the flow does not throw the punch away: it is queued as
 * is (`queued` with `signedOnline = true`) and the sync worker sends it, usually within a minute
 * (its first attempt follows at once unless an attempt ran in the last 60 s). The server treats it
 * as an online punch: `at` = the moment it arrives, no "Recorded offline" flag. When the gap is
 * long the stored time is later than the tap; the alternative, telling the worker to tap again,
 * costs a second prompt for a server hiccup. The design flags this for the owner.
 *
 * Pure apart from its injected dependencies; tests pass `FakeBiometricSigner`, a fake client, a
 * fake reader, a `PunchQueue` over `MemoryDatabase`, a fixed clock and UUID source.
 */
import {
  BIOMETRIC_REQUIRED,
  DUPLICATE_SENTENCE,
  KEY_INVALIDATED,
  SAVED_OFFLINE,
  canonicalPunchPayload,
  flagSentence,
  formatPhoneTime,
  punchConfirmation,
} from '@inventory-platform/attendance-protocol';
import type {
  AppErrorCode,
  AppPunchFields,
  AppPunchRequest,
  AppPunchResponse,
  PunchDirection,
} from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal, NoPairing } from '../api/appClient';
import { DEFAULT_LOCATION_TIMEOUT_MS, type LocationReader } from '../location/LocationReader';
import type { PunchQueue, QueuedPunch } from '../queue/PunchQueue';
import {
  DEFAULT_SIGN_PROMPT,
  isBiometricSignerError,
  type BiometricSigner,
  type BiometricSignerErrorCode,
  type SignPromptOptions,
} from '../signer/BiometricSigner';
import { base64Encode } from '../signer/base64';
import type { PairingRecord, PairingStore } from '../state/pairingStore';
import type { Reachability } from './reachability';

/** The slice of `AppClient` the flow calls. */
export interface PunchClient {
  postPunch(request: AppPunchRequest): Promise<AppPunchResponse>;
}

/** What the home screen passes along with the tap. */
export interface PunchContext {
  /**
   * The direction the phone expects (the home-screen label, R4.1a / R6.4). Only used as the
   * `directionGuess` of a queued punch; the server decides the real direction (R4.9).
   */
  directionGuess: PunchDirection;
}

export interface PunchFlowDeps {
  client: PunchClient;
  signer: Pick<BiometricSigner, 'signPunch'>;
  locationReader: Pick<LocationReader, 'read'>;
  pairingStore: Pick<PairingStore, 'load' | 'wipe'>;
  /** Step 0 (R6.1): decides `offline` before the biometric prompt. */
  reachability: Reachability;
  /** Where a punch is saved when the server is not reachable (R6.2). */
  queue: Pick<PunchQueue, 'enqueue'>;
  /** Called after a punch was queued (`SyncWorker.queueChanged`): publish the state, try to send. */
  onQueued?: (punch: QueuedPunch) => Promise<void> | void;
  /** Phone clock in epoch milliseconds; `Date.now` on the phone. */
  clock?: () => number;
  /** UUID v4 source for `punchId`; `expo-crypto`'s `randomUUID` on the phone. */
  uuid?: () => string;
  /** R4.2a: how long to wait for a position. Default 15 s. */
  locationTimeoutMs?: number;
  /** Wording of the biometric prompt. */
  prompt?: SignPromptOptions;
}

/** The outcome of one tap, as the home screen shows it. */
export type PunchResult =
  /** The server stored the punch (or replayed the stored result); `lines` is the confirmation. */
  | {
      kind: 'stored';
      response: AppPunchResponse;
      /** Confirmation first, then one sentence per flag, then the duplicate line when it applies. */
      lines: string[];
    }
  /** The server refused with a reason; `message` is shown word for word (R4.3). */
  | { kind: 'refused'; message: string; code: AppErrorCode | undefined }
  /** The pairing is gone; the phone has been wiped and must show the pairing screen (R3.3). */
  | { kind: 'unpaired'; message: string }
  /** The biometric check failed, was cancelled or is locked out; nothing stored or sent (R5.5). */
  | { kind: 'biometric_required'; message: string; code: BiometricSignerErrorCode }
  /**
   * The signer could not sign for another reason (`KEY_INVALIDATED`, `NO_KEYS`, unavailable);
   * nothing was sent. The caller wipes on `KEY_INVALIDATED` (`endPairingIf`).
   */
  | { kind: 'signer_error'; message: string; code: BiometricSignerErrorCode }
  /**
   * The server was not reachable (R6.1): the signed punch is saved on the phone and will be sent
   * by the sync worker (R6.2–R6.3). `message` is `SAVED_OFFLINE`. `signedOnline` is true in the
   * edge case where the probe said reachable but the send then failed (module comment).
   */
  | { kind: 'queued'; message: string; punch: QueuedPunch; signedOnline: boolean };

const BIOMETRIC_CHECK_CODES: ReadonlySet<BiometricSignerErrorCode> = new Set([
  'BIOMETRIC_FAILED',
  'BIOMETRIC_CANCELLED',
  'BIOMETRIC_LOCKED_OUT',
]);

export class PunchFlow {
  private readonly clock: () => number;
  private readonly uuid: () => string;
  private readonly locationTimeoutMs: number;
  private readonly prompt: SignPromptOptions;

  constructor(private readonly deps: PunchFlowDeps) {
    this.clock = deps.clock ?? Date.now;
    this.uuid = deps.uuid ?? defaultRandomUUID;
    this.locationTimeoutMs = deps.locationTimeoutMs ?? DEFAULT_LOCATION_TIMEOUT_MS;
    this.prompt = deps.prompt ?? DEFAULT_SIGN_PROMPT;
  }

  /** One tap on the punch button. Never rejects for a worker-facing outcome. */
  async run(context: PunchContext): Promise<PunchResult> {
    const pairing = await this.deps.pairingStore.load();
    if (pairing == null) {
      return { kind: 'unpaired', message: new NoPairing().message };
    }

    // Step 0 — is the server there? Decides the one payload's `offline` flag (R6.1, R6.2).
    const reachable = await this.deps.reachability.probe();

    // Step 1 — location, only when the shop's Location check was on as last received (R4.2a).
    const location = await this.readLocation(pairing);

    // Step 2 — sign; the prompt is the biometric check (R4.2b, R5.3).
    const fields: AppPunchFields = {
      pairingId: pairing.pairingId,
      shopId: pairing.shopId,
      employeeId: pairing.employeeId,
      punchId: this.uuid().toLowerCase(),
      phoneTime: formatPhoneTime(new Date(this.clock())),
      offline: !reachable,
      ...location,
    };
    const payload = canonicalPunchPayload(fields);
    let signature: Uint8Array;
    try {
      signature = await this.deps.signer.signPunch(payload, this.prompt);
    } catch (error) {
      if (isBiometricSignerError(error)) {
        if (BIOMETRIC_CHECK_CODES.has(error.code)) {
          return { kind: 'biometric_required', message: BIOMETRIC_REQUIRED, code: error.code };
        }
        return {
          kind: 'signer_error',
          message: error.code === 'KEY_INVALIDATED' ? KEY_INVALIDATED : error.message,
          code: error.code,
        };
      }
      throw error;
    }
    const request: AppPunchRequest = { ...fields, signature: base64Encode(signature) };

    // Step 3 — save (R6.2) …
    if (!reachable) {
      return this.enqueue(request, context, false);
    }

    // … or send (R4.2c).
    try {
      const response = await this.deps.client.postPunch(request);
      return { kind: 'stored', response, lines: confirmationLines(response) };
    } catch (error) {
      if (isServerRefusal(error)) {
        if (error.notPaired) {
          await this.deps.pairingStore.wipe();
          return { kind: 'unpaired', message: error.message };
        }
        return { kind: 'refused', message: error.message, code: error.code };
      }
      if (error instanceof NoPairing) {
        return { kind: 'unpaired', message: error.message };
      }
      if (isNotReachable(error)) {
        // The probe was wrong by the time the send ran: keep the signed punch (module comment).
        return this.enqueue(request, context, true);
      }
      throw error;
    }
  }

  private async enqueue(
    request: AppPunchRequest,
    context: PunchContext,
    signedOnline: boolean,
  ): Promise<PunchResult> {
    const punch = await this.deps.queue.enqueue(request, context.directionGuess);
    await this.deps.onQueued?.(punch);
    return { kind: 'queued', message: SAVED_OFFLINE, punch, signedOnline };
  }

  private async readLocation(
    pairing: PairingRecord,
  ): Promise<
    Pick<AppPunchFields, 'locationChecked' | 'distanceMetres' | 'accuracyMetres' | 'mock'>
  > {
    if (!pairing.location.locationCheck) {
      return { locationChecked: false, distanceMetres: null, accuracyMetres: null, mock: false };
    }
    const reading = await this.deps.locationReader.read(this.locationTimeoutMs, pairing.location);
    if (reading === 'NO_LOCATION') {
      return { locationChecked: true, distanceMetres: null, accuracyMetres: null, mock: false };
    }
    return {
      locationChecked: true,
      distanceMetres: reading.distanceMetres,
      accuracyMetres: reading.accuracyMetres,
      mock: reading.mocked,
    };
  }
}

/**
 * The lines shown after a stored punch (R4.7, R4.8): the confirmation with the server's local
 * time, one plain sentence per flag, and the duplicate line when the punch did not change today's
 * times. A replayed answer (R5.10) reads the same as the first one.
 */
export function confirmationLines(response: AppPunchResponse): string[] {
  const lines = [punchConfirmation(response.direction, response.atLocal)];
  for (const flag of response.flags ?? []) {
    lines.push(flagSentence(flag));
  }
  if (response.duplicate) {
    lines.push(DUPLICATE_SENTENCE);
  }
  return lines;
}

function defaultRandomUUID(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!c?.randomUUID) {
    throw new Error(
      'crypto.randomUUID is not available on this runtime; pass uuid in PunchFlowDeps',
    );
  }
  return c.randomUUID();
}
