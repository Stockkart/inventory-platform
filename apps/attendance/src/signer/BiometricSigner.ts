/**
 * `BiometricSigner`: the one TypeScript interface behind which the only platform-specific code of
 * the app lives (design DD5, R4.11, R5.12). Everything else in the app (pairing, punch flow, the
 * request client) talks to this interface; the Expo Module under `modules/biometric-signer`
 * implements it for Android (Kotlin) and iOS (Swift), and `FakeBiometricSigner` implements it
 * with WebCrypto for tests.
 *
 * Two hardware-backed P-256 keys per pairing (design DD2):
 * - the **punch key** signs the canonical punch payload and unlocks only after a strong biometric
 *   check, once per signature (R5.2, R5.3);
 * - the **device key** signs every request envelope with no prompt.
 *
 * Signatures are DER `ECDSA-Sig-Value` over SHA-256, public keys DER `SubjectPublicKeyInfo`, as
 * the server's `AppSignatures.verify` expects (design DD3).
 */
import type {
  BiometricSignerNativeModule,
  NativeCreateKeysOptions,
  NativePromptOptions,
  NativeSignerCapability,
} from '../../modules/biometric-signer/src/BiometricSigner.types';
import { base64Decode, base64Encode } from './base64';

/** Result of {@link BiometricSigner.capability}: whether this phone can be paired (R2.7, R5.4). */
export type SignerCapability = NativeSignerCapability;

/** Codes carried by {@link BiometricSignerError}. */
export type BiometricSignerErrorCode =
  /** The phone did not recognise the fingerprint or face, or the prompt ended without a result (R4.2b). */
  | 'BIOMETRIC_FAILED'
  /** The worker cancelled or backed out of the prompt (R4.2b). */
  | 'BIOMETRIC_CANCELLED'
  /** The phone reports the biometric as locked out after too many attempts (R4.2b). */
  | 'BIOMETRIC_LOCKED_OUT'
  /** The punch key was invalidated by a change to the phone's biometric enrolment; pair again. */
  | 'KEY_INVALIDATED'
  /** No hardware-backed key store: the phone cannot be paired (R5.4, R9.4). */
  | 'NO_SECURE_HARDWARE'
  /** No strong fingerprint or face enrolled, or no strong biometric hardware (R5.4). */
  | 'NO_STRONG_BIOMETRIC'
  /** No key pair exists on this installation (never created, wiped, or lost with the app data; R5.9). */
  | 'NO_KEYS'
  /** The native module failed for a reason outside the list above. */
  | 'SIGNER_UNAVAILABLE';

/** Both public keys, Base64 DER SPKI, as `POST /pairings/complete` wants them. */
export interface SignerPublicKeys {
  punchPublicKeySpki: string;
  devicePublicKeySpki: string;
  /**
   * Android key attestation chain of the punch key (task 16.4): Base64 DER X.509, leaf first.
   * Present only when {@link CreateKeysOptions.attestationChallenge} was given and the key store
   * produced a chain; never on iOS or from `FakeBiometricSigner`.
   */
  punchAttestationChain?: string[];
}

/** Options of {@link BiometricSigner.createKeys}. */
export interface CreateKeysOptions {
  /**
   * Bytes the secure hardware signs into the attestation (`setAttestationChallenge`); the server
   * expects the claim token's UTF-8 bytes. Absent = no attestation requested.
   */
  attestationChallenge?: Uint8Array;
}

/** Wording for the system prompt shown by {@link BiometricSigner.signPunch}. */
export type SignPromptOptions = NativePromptOptions;

export interface BiometricSigner {
  /** Whether this phone can hold a pairing. Checked before a pairing code is sent (R2.7). */
  capability(): Promise<SignerCapability>;
  /**
   * Creates the punch key and the device key in secure hardware and returns their public keys.
   * Replaces any existing keys. Rejects with `NO_SECURE_HARDWARE` or `NO_STRONG_BIOMETRIC`. With
   * an `attestationChallenge`, Android also returns the punch key's attestation chain when it can.
   */
  createKeys(options?: CreateKeysOptions): Promise<SignerPublicKeys>;
  /**
   * Raises the phone's strong biometric prompt and, when it passes, signs `bytes` with the punch
   * key. Each call needs its own successful check (R5.3). Rejects with `BIOMETRIC_FAILED`,
   * `BIOMETRIC_CANCELLED`, `BIOMETRIC_LOCKED_OUT`, `KEY_INVALIDATED` or `NO_KEYS`; nothing is
   * signed in those cases (R4.2d, R5.5).
   */
  signPunch(bytes: Uint8Array, prompt?: SignPromptOptions): Promise<Uint8Array>;
  /** Signs `bytes` with the device key; no prompt. Rejects with `NO_KEYS`. */
  signRequest(bytes: Uint8Array): Promise<Uint8Array>;
  /** Deletes both keys. Resolves when they are already absent. */
  deleteKeys(): Promise<void>;
}

/** Thrown (as a rejection) by every {@link BiometricSigner} method. */
export class BiometricSignerError extends Error {
  readonly code: BiometricSignerErrorCode;
  /** The code the native module reported when it differs from {@link code} (debugging only). */
  readonly nativeCode?: string;

  constructor(code: BiometricSignerErrorCode, message?: string, nativeCode?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'BiometricSignerError';
    this.code = code;
    this.nativeCode = nativeCode;
  }
}

/** Type guard for {@link BiometricSignerError}; `code` narrows to one code when given. */
export function isBiometricSignerError(
  error: unknown,
  code?: BiometricSignerErrorCode,
): error is BiometricSignerError {
  return error instanceof BiometricSignerError && (code === undefined || error.code === code);
}

const DEFAULT_MESSAGES: Readonly<Record<BiometricSignerErrorCode, string>> = {
  BIOMETRIC_FAILED: 'The fingerprint or face check did not pass.',
  BIOMETRIC_CANCELLED: 'The fingerprint or face check was cancelled.',
  BIOMETRIC_LOCKED_OUT: 'The fingerprint or face check is locked out after too many attempts.',
  KEY_INVALIDATED: "The phone's fingerprint or face settings changed, so the punch key is invalid.",
  NO_SECURE_HARDWARE: 'This phone has no secure hardware for the Attendance app.',
  NO_STRONG_BIOMETRIC: 'No strong fingerprint or face unlock is available on this phone.',
  NO_KEYS: 'No pairing keys exist on this phone.',
  SIGNER_UNAVAILABLE: 'The biometric signer is not available.',
};

/** Default prompt wording; screens pass their own when they have better context. */
export const DEFAULT_SIGN_PROMPT: SignPromptOptions = {
  title: 'Confirm it is you',
  subtitle: 'Use your fingerprint or face to record this punch',
  cancelLabel: 'Cancel',
};

const KNOWN_CODES: ReadonlySet<string> = new Set<BiometricSignerErrorCode>([
  'BIOMETRIC_FAILED',
  'BIOMETRIC_CANCELLED',
  'BIOMETRIC_LOCKED_OUT',
  'KEY_INVALIDATED',
  'NO_SECURE_HARDWARE',
  'NO_STRONG_BIOMETRIC',
  'NO_KEYS',
]);

/**
 * Turns whatever the native module rejected with into a {@link BiometricSignerError}. Expo
 * surfaces a Kotlin `CodedException` / Swift `Exception` as an `Error` with a `code` property;
 * codes outside the signer's list (for example Expo's own `ERR_MISSING_ACTIVITY`) become
 * `SIGNER_UNAVAILABLE` with the original code kept in `nativeCode`.
 */
export function toBiometricSignerError(error: unknown): BiometricSignerError {
  if (error instanceof BiometricSignerError) {
    return error;
  }
  const code = codeOf(error);
  const message = messageOf(error);
  if (code !== undefined && KNOWN_CODES.has(code)) {
    return new BiometricSignerError(code as BiometricSignerErrorCode, message);
  }
  return new BiometricSignerError('SIGNER_UNAVAILABLE', message, code);
}

function codeOf(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function messageOf(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return undefined;
}

/**
 * {@link BiometricSigner} over the Expo Module. Bytes go to and from the module as Base64; every
 * rejection is mapped with {@link toBiometricSignerError}. The module object is injected so tests
 * can drive the mapping without a native runtime; `nativeSigner.ts` builds the real one.
 */
export class NativeBiometricSigner implements BiometricSigner {
  constructor(private readonly native: BiometricSignerNativeModule) {}

  capability(): Promise<SignerCapability> {
    return guard(() => this.native.capability());
  }

  createKeys(options?: CreateKeysOptions): Promise<SignerPublicKeys> {
    return guard(async () => {
      const nativeOptions: NativeCreateKeysOptions = {};
      if (options?.attestationChallenge) {
        nativeOptions.attestationChallenge = base64Encode(options.attestationChallenge);
      }
      const keys = await this.native.createKeys(nativeOptions);
      const result: SignerPublicKeys = {
        punchPublicKeySpki: keys.punchPublicKey,
        devicePublicKeySpki: keys.devicePublicKey,
      };
      if (keys.punchAttestationChain && keys.punchAttestationChain.length > 0) {
        result.punchAttestationChain = [...keys.punchAttestationChain];
      }
      return result;
    });
  }

  signPunch(
    bytes: Uint8Array,
    prompt: SignPromptOptions = DEFAULT_SIGN_PROMPT,
  ): Promise<Uint8Array> {
    return guard(async () =>
      base64Decode(await this.native.signPunch(base64Encode(bytes), prompt)),
    );
  }

  signRequest(bytes: Uint8Array): Promise<Uint8Array> {
    return guard(async () => base64Decode(await this.native.signRequest(base64Encode(bytes))));
  }

  deleteKeys(): Promise<void> {
    return guard(() => this.native.deleteKeys());
  }
}

async function guard<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toBiometricSignerError(error);
  }
}
