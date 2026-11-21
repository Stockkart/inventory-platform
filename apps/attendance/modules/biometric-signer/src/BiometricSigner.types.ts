/**
 * The wire shape of the `BiometricSigner` Expo Module as the Kotlin (`android/`) and Swift
 * (`ios/`) implementations expose it. Bytes cross the bridge as standard Base64 text (RFC 4648,
 * with padding, no line breaks); keys are DER `SubjectPublicKeyInfo`, signatures DER
 * `ECDSA-Sig-Value`, both P-256 / SHA-256 (design DD3).
 *
 * This file has no runtime imports so that `src/signer/BiometricSigner.ts` can import the types
 * without loading `expo` (which needs a React Native runtime). `index.ts` next to it does the
 * `requireNativeModule` call.
 */

/** What `capability()` reports, before any key exists (R2.7, R5.4). */
export type NativeSignerCapability =
  /** Strong biometric enrolled and a hardware-backed key store is available. */
  | 'STRONG_BIOMETRIC_READY'
  /** The phone cannot create a key inside secure hardware (StrongBox or TEE). */
  | 'NO_SECURE_HARDWARE'
  /** Strong biometric hardware exists but no fingerprint or face is enrolled. */
  | 'NO_STRONG_BIOMETRIC_ENROLLED'
  /** No strong (class 3) biometric hardware, or it cannot be used right now. */
  | 'NO_STRONG_BIOMETRIC_HARDWARE';

/**
 * Error codes the native module rejects with (`CodedException` / `promise.reject`). The JS side
 * reads them from the rejected error's `code` property.
 */
export type NativeSignerErrorCode =
  | 'BIOMETRIC_FAILED'
  | 'BIOMETRIC_CANCELLED'
  | 'BIOMETRIC_LOCKED_OUT'
  | 'KEY_INVALIDATED'
  | 'NO_SECURE_HARDWARE'
  | 'NO_STRONG_BIOMETRIC'
  | 'NO_KEYS';

/** Text shown on the system biometric prompt; the module never chooses wording itself. */
export interface NativePromptOptions {
  title: string;
  subtitle?: string;
  /** Label of the only button on the prompt. Tapping it is `BIOMETRIC_CANCELLED`. */
  cancelLabel: string;
}

export interface NativePublicKeys {
  /** Base64 DER SPKI of the biometric-gated punch key (R5.1). */
  punchPublicKey: string;
  /** Base64 DER SPKI of the device key that signs request envelopes (design DD2). */
  devicePublicKey: string;
  /**
   * Android only (task 16.4): the key attestation certificate chain of the punch key as
   * `KeyStore.getCertificateChain` returns it, Base64 DER X.509, leaf first; present only when a
   * challenge was given and the key store produced a chain. iOS never sets it.
   */
  punchAttestationChain?: string[];
}

/** Options of `createKeys()`; every field optional so older callers need no change. */
export interface NativeCreateKeysOptions {
  /**
   * Bytes for `KeyGenParameterSpec.setAttestationChallenge` on the punch key (Android); Base64.
   * The server expects the claim token's UTF-8 bytes. Absent = no attestation requested.
   */
  attestationChallenge?: string;
}

export interface BiometricSignerNativeModule {
  capability(): Promise<NativeSignerCapability>;
  /** Creates both key pairs in secure hardware, replacing any existing pair. */
  createKeys(options?: NativeCreateKeysOptions): Promise<NativePublicKeys>;
  /** True when both key pairs exist in the key store. */
  hasKeys(): Promise<boolean>;
  /** Raises the strong-biometric prompt and signs the bytes with the punch key. Base64 DER signature. */
  signPunch(payloadBase64: string, prompt: NativePromptOptions): Promise<string>;
  /** Signs the bytes with the device key, no prompt. Base64 DER signature. */
  signRequest(payloadBase64: string): Promise<string>;
  /** Deletes both key pairs; succeeds when they are already gone. */
  deleteKeys(): Promise<void>;
}
