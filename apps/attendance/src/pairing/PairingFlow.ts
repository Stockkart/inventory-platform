/**
 * The pairing handshake as the phone runs it (design DD7, R2.3–R2.9, R2.14, R5.1, R5.4):
 *
 * 1. {@link PairingFlow.submitCode}: the scanned or typed text must hold a valid 8-character code
 *    (`pairingCodeFromScan`) or nothing is sent; the local lockout (R2.5) must be open; the phone
 *    must report `STRONG_BIOMETRIC_READY` (R2.7) or the code is kept and the worker is told which
 *    setting to turn on; then `POST /pairings/claim` returns the names and the consent text.
 * 2. "No, this isn't me" or "Don't agree": {@link PairingFlow.decline} → `POST /pairings/abandon`.
 * 3. "I agree": {@link PairingFlow.agree} → `createKeys()` in secure hardware, with the claim
 *    token as attestation challenge → `POST /pairings/complete` with both public keys and, when
 *    the phone produced one, the punch key's attestation chain (task 16.4) → `pairingStore.save()`.
 *
 * Pure: the client, signer, store, device description and clock are injected, so the whole flow
 * runs in a unit test with `FakeBiometricSigner` and a scripted client. Screens hold React state
 * and render the result unions below; they make no decisions of their own.
 */
import {
  NO_SECURE_HARDWARE,
  NO_STRONG_BIOMETRIC_ENROLLED,
  NO_STRONG_BIOMETRIC_HARDWARE,
  PAIRING_NO_NETWORK,
  SERVER_MESSAGES,
  pairingCodeFromScan,
  utf8Bytes,
} from '@inventory-platform/attendance-protocol';
import type {
  AbandonPairingRequest,
  AbandonPairingResponse,
  AppErrorCode,
  ClaimPairingRequest,
  ClaimPairingResponse,
  CompletePairingRequest,
  DeviceOs,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import {
  isBiometricSignerError,
  type BiometricSigner,
  type SignerCapability,
  type SignerPublicKeys,
} from '../signer/BiometricSigner';
import {
  CodeAttemptLockout,
  lockoutCountdown,
  minutesFromLockedMessage,
} from './CodeAttemptLockout';

/** The three unsigned calls of `AppClient` the handshake uses. */
export interface PairingClient {
  claim(request: ClaimPairingRequest): Promise<ClaimPairingResponse>;
  complete(request: CompletePairingRequest): Promise<PairingBootstrap>;
  abandon(request: AbandonPairingRequest): Promise<AbandonPairingResponse>;
}

/** The part of `BiometricSigner` pairing needs: the gate, key creation, and cleanup on failure. */
export type PairingSigner = Pick<BiometricSigner, 'capability' | 'createKeys' | 'deleteKeys'>;

/** The part of `PairingStore` pairing needs. */
export interface PairingStoreLike {
  installationId(): Promise<string>;
  save(pairing: PairingBootstrap): Promise<void>;
}

/** What the phone reports about itself in `claim` (R2.15: model and OS version only). */
export interface DeviceInfo {
  os: DeviceOs;
  osVersion: string;
  /** ≤ 80 characters; the server's validator refuses longer. */
  phoneModel: string;
  appVersion: string;
}

export interface PairingFlowDeps {
  client: PairingClient;
  signer: PairingSigner;
  store: PairingStoreLike;
  device: DeviceInfo;
  /** Epoch milliseconds; defaults to `Date.now`. */
  now?: () => number;
  lockout?: CodeAttemptLockout;
}

/** Outcome of {@link PairingFlow.submitCode}. */
export type SubmitCodeResult =
  /** Not 8 characters of the alphabet after normalisation. Nothing was sent (R2.3). */
  | { kind: 'invalid_code'; message: string }
  /** R2.5: the local lockout is on; `remainingMs` drives the countdown. Nothing was sent. */
  | { kind: 'locked'; remainingMs: number; message: string }
  /** R2.7: no strong biometric or no secure hardware. Nothing was sent; the code is kept. */
  | { kind: 'phone_not_ready'; capability: SignerCapability | 'UNKNOWN'; message: string }
  /** The server accepted the code: show the names and ask "Yes, this is me" (R2.6). */
  | { kind: 'claimed'; code: string; claim: ClaimPairingResponse }
  /** A server refusal from the R2.14 list, text word for word. */
  | { kind: 'refused'; code: AppErrorCode | undefined; message: string }
  /** R2.14 "no network": offer Retry; the code stays valid for its remaining time. */
  | { kind: 'not_reachable'; message: string };

/** Outcome of {@link PairingFlow.agree}. */
export type AgreeResult =
  /** Stored on the phone; show the confirmation with shop and employee name (R2.9). */
  | { kind: 'paired'; pairing: PairingBootstrap }
  /** `createKeys()` refused: no secure hardware or no strong biometric (R5.4). */
  | { kind: 'phone_not_ready'; message: string }
  /** The server refused `complete` (code expired or used meanwhile, employee exited, switch off). */
  | { kind: 'refused'; code: AppErrorCode | undefined; message: string }
  /** No answer; Retry sends the same keys again. */
  | { kind: 'not_reachable'; message: string };

/** Outcome of {@link PairingFlow.decline}; the code is invalid either way once the server hears. */
export interface DeclineResult {
  /** False when the server could not be reached; the code then dies at its 15-minute expiry. */
  abandoned: boolean;
}

/** Code refusals that count towards the local lockout (R2.5), as the server counts them. */
const COUNTED_CODE_REFUSALS: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'HR_PAIRING_CODE_EXPIRED',
  'HR_PAIRING_CODE_USED',
  'HR_PAIRING_CODE_CANCELLED',
  'HR_PAIRING_CODE_WRONG',
  'HR_TOO_MANY_ATTEMPTS',
]);

export class PairingFlow {
  private readonly client: PairingClient;
  private readonly signer: PairingSigner;
  private readonly store: PairingStoreLike;
  private readonly device: DeviceInfo;
  private readonly now: () => number;
  private readonly lockout: CodeAttemptLockout;

  /** Keys created for a claim token whose `complete` got no answer; a retry resends the same ones. */
  private pendingKeys: { claimToken: string; keys: SignerPublicKeys } | null = null;

  constructor(deps: PairingFlowDeps) {
    this.client = deps.client;
    this.signer = deps.signer;
    this.store = deps.store;
    this.device = deps.device;
    this.now = deps.now ?? Date.now;
    this.lockout = deps.lockout ?? new CodeAttemptLockout();
  }

  /** Milliseconds left on the local lockout; 0 when attempts are allowed (R2.5). */
  lockoutRemainingMs(): number {
    return this.lockout.remainingMs(this.now());
  }

  /**
   * The code a scanned QR payload or typed text holds, normalised, or null when it holds none.
   * Screens use it to reject typing before enabling "Continue"; {@link submitCode} checks it again.
   */
  parseCode(text: string | null | undefined): string | null {
    return pairingCodeFromScan(text);
  }

  /** Step 1 (R2.3, R2.5, R2.6, R2.7): validate, gate, claim. */
  async submitCode(text: string): Promise<SubmitCodeResult> {
    const code = this.parseCode(text);
    if (code == null) {
      return { kind: 'invalid_code', message: SERVER_MESSAGES.HR_PAIRING_CODE_WRONG };
    }

    const locked = this.lockoutRemainingMs();
    if (locked > 0) {
      return { kind: 'locked', remainingMs: locked, message: lockoutCountdown(locked) };
    }

    const gate = await this.checkPhone();
    if (gate) {
      return gate;
    }

    let claim: ClaimPairingResponse;
    try {
      claim = await this.client.claim({
        code,
        installationId: await this.store.installationId(),
        os: this.device.os,
        osVersion: this.device.osVersion,
        phoneModel: this.device.phoneModel.slice(0, 80),
        appVersion: this.device.appVersion,
      });
    } catch (error) {
      if (isNotReachable(error)) {
        return { kind: 'not_reachable', message: PAIRING_NO_NETWORK };
      }
      if (isServerRefusal(error)) {
        return this.codeRefused(error.code, error.message);
      }
      throw error;
    }

    this.pendingKeys = null;
    return { kind: 'claimed', code, claim };
  }

  /** "No, this isn't me" / "Don't agree" (R2.6, R2.8): the code is invalidated. */
  async decline(claimToken: string): Promise<DeclineResult> {
    await this.dropPendingKeys(claimToken);
    try {
      const answer = await this.client.abandon({ claimToken });
      return { abandoned: answer.abandoned === true };
    } catch (error) {
      if (isNotReachable(error) || isServerRefusal(error)) {
        // Already invalid on the server, or unreachable: the code expires on its own (R9.11).
        return { abandoned: false };
      }
      throw error;
    }
  }

  /** "I agree" (R2.9, R5.1): keys in secure hardware → complete → save. */
  async agree(claimToken: string, consentVersion: number): Promise<AgreeResult> {
    let keys: SignerPublicKeys;
    if (this.pendingKeys?.claimToken === claimToken) {
      keys = this.pendingKeys.keys;
    } else {
      try {
        // The claim token is the attestation challenge the server checks (task 16.4).
        keys = await this.signer.createKeys({ attestationChallenge: utf8Bytes(claimToken) });
      } catch (error) {
        return { kind: 'phone_not_ready', message: createKeysMessage(error) };
      }
      this.pendingKeys = { claimToken, keys };
    }

    const request: CompletePairingRequest = {
      claimToken,
      installationId: await this.store.installationId(),
      punchPublicKey: keys.punchPublicKeySpki,
      devicePublicKey: keys.devicePublicKeySpki,
      consentVersion,
    };
    if (keys.punchAttestationChain && keys.punchAttestationChain.length > 0) {
      // The server verifies and records it; a phone without a chain pairs exactly as before.
      request.attestationChain = keys.punchAttestationChain;
    }

    let pairing: PairingBootstrap;
    try {
      pairing = await this.client.complete(request);
    } catch (error) {
      if (isNotReachable(error)) {
        return { kind: 'not_reachable', message: PAIRING_NO_NETWORK };
      }
      if (isServerRefusal(error)) {
        await this.dropPendingKeys(claimToken);
        return { kind: 'refused', code: error.code, message: error.message };
      }
      throw error;
    }

    await this.store.save(pairing);
    this.pendingKeys = null;
    this.lockout.reset();
    return { kind: 'paired', pairing };
  }

  // --- helpers ---

  /** R2.7, R5.4: the phone must be able to hold a biometric-gated key before any code is sent. */
  private async checkPhone(): Promise<SubmitCodeResult | null> {
    let capability: SignerCapability;
    try {
      capability = await this.signer.capability();
    } catch (error) {
      return {
        kind: 'phone_not_ready',
        capability: 'UNKNOWN',
        message: error instanceof Error && error.message ? error.message : NO_SECURE_HARDWARE,
      };
    }
    if (capability === 'STRONG_BIOMETRIC_READY') {
      return null;
    }
    return { kind: 'phone_not_ready', capability, message: capabilityMessage(capability) };
  }

  private codeRefused(code: AppErrorCode | undefined, message: string): SubmitCodeResult {
    const now = this.now();
    if (code === 'HR_PAIRING_CODE_LOCKED') {
      const minutes = minutesFromLockedMessage(message);
      if (minutes != null) {
        this.lockout.lockFor(minutes * 60_000, now);
      }
      const remaining = this.lockoutRemainingMs();
      return remaining > 0
        ? { kind: 'locked', remainingMs: remaining, message }
        : { kind: 'refused', code, message };
    }
    if (code !== undefined && COUNTED_CODE_REFUSALS.has(code)) {
      const lockedFor = this.lockout.recordRefusal(now);
      if (lockedFor > 0) {
        return { kind: 'locked', remainingMs: lockedFor, message: lockoutCountdown(lockedFor) };
      }
    }
    return { kind: 'refused', code, message };
  }

  private async dropPendingKeys(claimToken: string): Promise<void> {
    if (this.pendingKeys?.claimToken !== claimToken) {
      return;
    }
    this.pendingKeys = null;
    try {
      await this.signer.deleteKeys();
    } catch {
      // Nothing was saved; stale keys are replaced by the next createKeys().
    }
  }
}

/** The sentence for a `capability()` answer other than ready (R2.7, R5.4). */
export function capabilityMessage(
  capability: Exclude<SignerCapability, 'STRONG_BIOMETRIC_READY'>,
): string {
  switch (capability) {
    case 'NO_SECURE_HARDWARE':
      return NO_SECURE_HARDWARE;
    case 'NO_STRONG_BIOMETRIC_ENROLLED':
      return NO_STRONG_BIOMETRIC_ENROLLED;
    case 'NO_STRONG_BIOMETRIC_HARDWARE':
      return NO_STRONG_BIOMETRIC_HARDWARE;
  }
}

function createKeysMessage(error: unknown): string {
  if (isBiometricSignerError(error, 'NO_SECURE_HARDWARE')) {
    return NO_SECURE_HARDWARE;
  }
  if (isBiometricSignerError(error, 'NO_STRONG_BIOMETRIC')) {
    return NO_STRONG_BIOMETRIC_ENROLLED;
  }
  return error instanceof Error && error.message ? error.message : NO_SECURE_HARDWARE;
}
