/**
 * Public surface of `src/signer`. The bound native instance is exported from `./nativeSigner`
 * only, so importing the types, the error class or the test fake never touches `expo`.
 */
export {
  BiometricSignerError,
  DEFAULT_SIGN_PROMPT,
  NativeBiometricSigner,
  isBiometricSignerError,
  toBiometricSignerError,
} from './BiometricSigner';
export type {
  BiometricSigner,
  BiometricSignerErrorCode,
  CreateKeysOptions,
  SignPromptOptions,
  SignerCapability,
  SignerPublicKeys,
} from './BiometricSigner';
export {
  FakeBiometricSigner,
  PUNCH_PROMPT_ERROR_CODES,
  verifyEcdsaSignature,
} from './FakeBiometricSigner';
export type { FakeBiometricSignerOptions, FakePromptOutcome } from './FakeBiometricSigner';
export { base64Decode, base64Encode } from './base64';
export { P256_FIELD_BYTES, derToRawEcdsa, rawToDerEcdsa } from './der';
