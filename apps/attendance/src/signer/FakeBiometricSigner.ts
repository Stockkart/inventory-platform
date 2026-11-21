/**
 * In-memory {@link BiometricSigner} for unit tests of the code that calls the signer (pairing,
 * punch flow, request client). It makes real P-256 keys with WebCrypto (`globalThis.crypto.subtle`,
 * present in node 20 and in vitest) and real signatures, so a test can verify them, hand the public
 * key to a server stub, or check that the server-side verifier accepts them.
 *
 * The biometric prompt is scripted: `nextPunchOutcomes` is consumed one entry per `signPunch`
 * call; an empty queue means "passes". Nothing here runs on a phone.
 */
import {
  BiometricSignerError,
  type BiometricSigner,
  type BiometricSignerErrorCode,
  type CreateKeysOptions,
  type SignerCapability,
  type SignerPublicKeys,
  type SignPromptOptions,
} from './BiometricSigner';
import { base64Decode, base64Encode } from './base64';
import { derToRawEcdsa, rawToDerEcdsa } from './der';

/** Scripted result of one biometric prompt. */
export type FakePromptOutcome =
  | 'PASS'
  | 'BIOMETRIC_FAILED'
  | 'BIOMETRIC_CANCELLED'
  | 'BIOMETRIC_LOCKED_OUT';

/** Minimal typing of the WebCrypto surface used here (avoids `BufferSource` generics churn). */
interface SubtleLike {
  generateKey(
    algorithm: { name: 'ECDSA'; namedCurve: 'P-256' },
    extractable: boolean,
    usages: readonly ['sign', 'verify'],
  ): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }>;
  exportKey(format: 'spki', key: CryptoKey): Promise<ArrayBuffer>;
  importKey(
    format: 'spki',
    keyData: Uint8Array,
    algorithm: { name: 'ECDSA'; namedCurve: 'P-256' },
    extractable: boolean,
    usages: readonly ['verify'],
  ): Promise<CryptoKey>;
  sign(
    algorithm: { name: 'ECDSA'; hash: 'SHA-256' },
    key: CryptoKey,
    data: Uint8Array,
  ): Promise<ArrayBuffer>;
  verify(
    algorithm: { name: 'ECDSA'; hash: 'SHA-256' },
    key: CryptoKey,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean>;
}

const ECDSA_P256 = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

function subtle(): SubtleLike {
  const s = (globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle;
  if (!s) {
    throw new Error('FakeBiometricSigner needs globalThis.crypto.subtle (WebCrypto)');
  }
  return s as SubtleLike;
}

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface FakeBiometricSignerOptions {
  /** What `capability()` reports. Default `STRONG_BIOMETRIC_READY`. */
  capability?: SignerCapability;
}

export class FakeBiometricSigner implements BiometricSigner {
  /** What `capability()` answers; change it mid-test to simulate a settings change. */
  capabilityValue: SignerCapability;
  /** Outcomes consumed one per `signPunch`; empty = the check passes. */
  nextPunchOutcomes: FakePromptOutcome[] = [];
  /** Every prompt shown so far (one entry per `signPunch` call that reached the prompt). */
  readonly prompts: SignPromptOptions[] = [];
  /** Number of signatures the punch key produced. Each one implies one passed check (R5.3). */
  punchSignatures = 0;

  private punchKey: KeyPair | null = null;
  private deviceKey: KeyPair | null = null;
  private punchKeyInvalidated = false;

  constructor(options: FakeBiometricSignerOptions = {}) {
    this.capabilityValue = options.capability ?? 'STRONG_BIOMETRIC_READY';
  }

  async capability(): Promise<SignerCapability> {
    return this.capabilityValue;
  }

  /** Ignores `options`: WebCrypto keys have no attestation, so the result never carries a chain. */
  async createKeys(_options?: CreateKeysOptions): Promise<SignerPublicKeys> {
    if (this.capabilityValue === 'NO_SECURE_HARDWARE') {
      throw new BiometricSignerError('NO_SECURE_HARDWARE');
    }
    if (this.capabilityValue !== 'STRONG_BIOMETRIC_READY') {
      throw new BiometricSignerError('NO_STRONG_BIOMETRIC');
    }
    const s = subtle();
    const [punch, device] = await Promise.all([
      s.generateKey(ECDSA_P256, true, ['sign', 'verify']),
      s.generateKey(ECDSA_P256, true, ['sign', 'verify']),
    ]);
    this.punchKey = punch;
    this.deviceKey = device;
    this.punchKeyInvalidated = false;
    const [punchSpki, deviceSpki] = await Promise.all([
      s.exportKey('spki', punch.publicKey),
      s.exportKey('spki', device.publicKey),
    ]);
    return {
      punchPublicKeySpki: base64Encode(new Uint8Array(punchSpki)),
      devicePublicKeySpki: base64Encode(new Uint8Array(deviceSpki)),
    };
  }

  async signPunch(bytes: Uint8Array, prompt?: SignPromptOptions): Promise<Uint8Array> {
    if (!this.punchKey) {
      throw new BiometricSignerError('NO_KEYS');
    }
    if (this.punchKeyInvalidated) {
      throw new BiometricSignerError('KEY_INVALIDATED');
    }
    if (prompt) {
      this.prompts.push(prompt);
    }
    const outcome = this.nextPunchOutcomes.shift() ?? 'PASS';
    if (outcome !== 'PASS') {
      throw new BiometricSignerError(outcome);
    }
    const signature = await this.sign(this.punchKey, bytes);
    this.punchSignatures++;
    return signature;
  }

  async signRequest(bytes: Uint8Array): Promise<Uint8Array> {
    if (!this.deviceKey) {
      throw new BiometricSignerError('NO_KEYS');
    }
    return this.sign(this.deviceKey, bytes);
  }

  async deleteKeys(): Promise<void> {
    this.punchKey = null;
    this.deviceKey = null;
    this.punchKeyInvalidated = false;
  }

  // --- test controls ---

  /** True when both keys exist (what the native `hasKeys()` would say). */
  hasKeys(): boolean {
    return this.punchKey !== null && this.deviceKey !== null;
  }

  /** Simulates a biometric enrolment change: the next `signPunch` rejects with `KEY_INVALIDATED`. */
  invalidatePunchKey(): void {
    this.punchKeyInvalidated = true;
  }

  /** Makes every method reject with `code` until `createKeys()` is called again. */
  loseKeys(): void {
    this.punchKey = null;
    this.deviceKey = null;
  }

  private async sign(key: KeyPair, bytes: Uint8Array): Promise<Uint8Array> {
    const raw = await subtle().sign(ECDSA_SHA256, key.privateKey, bytes);
    return rawToDerEcdsa(new Uint8Array(raw));
  }
}

/**
 * Verifies a DER ECDSA P-256 / SHA-256 signature against a Base64 DER SPKI public key with
 * WebCrypto: the same check the server's `AppSignatures.verify` makes. For tests of callers.
 */
export async function verifyEcdsaSignature(
  spkiBase64: string,
  bytes: Uint8Array,
  derSignature: Uint8Array,
): Promise<boolean> {
  const s = subtle();
  let key: CryptoKey;
  try {
    key = await s.importKey('spki', base64Decode(spkiBase64), ECDSA_P256, false, ['verify']);
  } catch {
    return false;
  }
  let raw: Uint8Array;
  try {
    raw = derToRawEcdsa(derSignature);
  } catch {
    return false;
  }
  return s.verify(ECDSA_SHA256, key, raw, bytes);
}

/** Convenience for tests that script a failing prompt: the codes `signPunch` may reject with. */
export const PUNCH_PROMPT_ERROR_CODES: readonly BiometricSignerErrorCode[] = [
  'BIOMETRIC_FAILED',
  'BIOMETRIC_CANCELLED',
  'BIOMETRIC_LOCKED_OUT',
  'KEY_INVALIDATED',
  'NO_KEYS',
];
