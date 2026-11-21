package expo.modules.biometricsigner

import expo.modules.kotlin.exception.CodedException

/**
 * A rejection with one of the codes `src/signer/BiometricSigner.ts` understands. Expo passes the
 * code to JS as the rejected error's `code` property.
 */
class SignerException(
  code: String,
  message: String,
  cause: Throwable? = null
) : CodedException(code, message, cause) {
  companion object {
    const val BIOMETRIC_FAILED = "BIOMETRIC_FAILED"
    const val BIOMETRIC_CANCELLED = "BIOMETRIC_CANCELLED"
    const val BIOMETRIC_LOCKED_OUT = "BIOMETRIC_LOCKED_OUT"
    const val KEY_INVALIDATED = "KEY_INVALIDATED"
    const val NO_SECURE_HARDWARE = "NO_SECURE_HARDWARE"
    const val NO_STRONG_BIOMETRIC = "NO_STRONG_BIOMETRIC"
    const val NO_KEYS = "NO_KEYS"

    /** Anything the JS side has no specific handling for; it becomes `SIGNER_UNAVAILABLE` there. */
    const val SIGNER_ERROR = "SIGNER_ERROR"
    const val INVALID_ARGUMENT = "INVALID_ARGUMENT"
  }
}
