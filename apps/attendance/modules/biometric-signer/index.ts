import { requireNativeModule } from 'expo';

import type { BiometricSignerNativeModule } from './src/BiometricSigner.types';

export type {
  BiometricSignerNativeModule,
  NativeCreateKeysOptions,
  NativePromptOptions,
  NativePublicKeys,
  NativeSignerCapability,
  NativeSignerErrorCode,
} from './src/BiometricSigner.types';

/** Name the Kotlin and Swift modules register under (`Name("BiometricSigner")`). */
export const BIOMETRIC_SIGNER_MODULE_NAME = 'BiometricSigner';

/**
 * The linked native module. Throws when the module is not linked (Expo Go, or a build without
 * `modules/biometric-signer`); the app has no fallback on purpose: without the module there is no
 * hardware-backed key and so no punch (R5.1).
 */
const BiometricSignerModule = requireNativeModule<BiometricSignerNativeModule>(
  BIOMETRIC_SIGNER_MODULE_NAME,
);

export default BiometricSignerModule;
