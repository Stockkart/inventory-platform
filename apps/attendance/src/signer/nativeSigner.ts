/**
 * The app's one real {@link BiometricSigner}, bound to the linked Expo Module. Import this from
 * app code; tests import `FakeBiometricSigner` instead and never load this file (it needs the
 * React Native runtime through `expo`).
 */
import BiometricSignerModule from '../../modules/biometric-signer';
import { NativeBiometricSigner, type BiometricSigner } from './BiometricSigner';

export const biometricSigner: BiometricSigner = new NativeBiometricSigner(BiometricSignerModule);
