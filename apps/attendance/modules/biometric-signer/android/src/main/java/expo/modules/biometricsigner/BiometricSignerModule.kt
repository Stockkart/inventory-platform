package expo.modules.biometricsigner

import android.security.keystore.KeyPermanentlyInvalidatedException
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.concurrent.atomic.AtomicBoolean

/** Options of `createKeys`; mirrors `NativeCreateKeysOptions` in `src/BiometricSigner.types.ts`. */
class CreateKeysOptions : Record {
  /** Base64 bytes for `setAttestationChallenge` on the punch key; null = no attestation (task 16.4). */
  @Field
  val attestationChallenge: String? = null
}

/** Wording of the system prompt; mirrors `NativePromptOptions` in `src/BiometricSigner.types.ts`. */
class PromptOptions : Record {
  @Field
  val title: String = "Confirm it is you"

  @Field
  val subtitle: String? = null

  @Field
  val cancelLabel: String = "Cancel"
}

/**
 * `BiometricSigner` for Android (design DD4, DD5). JS contract: `modules/biometric-signer/src/BiometricSigner.types.ts`.
 *
 * The biometric prompt and the signature are one operation: the `Signature` initialised with the
 * punch key is handed to `BiometricPrompt` as a `CryptoObject`, and only the `Signature` the prompt
 * returns on success can `sign()`. Only `BIOMETRIC_STRONG` is allowed; `DEVICE_CREDENTIAL` is never
 * offered, so a PIN, pattern or password cannot stand in for the fingerprint or face (R5.2).
 */
class BiometricSignerModule : Module() {
  private val keys by lazy { SignerKeyStore(appContext.reactContext?.applicationContext) }

  override fun definition() = ModuleDefinition {
    Name("BiometricSigner")

    AsyncFunction("capability") { ->
      capability()
    }

    AsyncFunction("createKeys") { options: CreateKeysOptions? ->
      requireStrongBiometric()
      val challenge = options?.attestationChallenge?.let { decodeChallenge(it) }
      val created = keys.createKeys(challenge)
      val result = mutableMapOf<String, Any>(
        "punchPublicKey" to created.punchPublicKey,
        "devicePublicKey" to created.devicePublicKey
      )
      created.punchAttestationChain?.let { result["punchAttestationChain"] = it }
      result
    }

    AsyncFunction("hasKeys") { ->
      keys.hasKeys()
    }

    AsyncFunction("signPunch") { payloadBase64: String, prompt: PromptOptions, promise: Promise ->
      signPunch(decodePayload(payloadBase64), prompt, promise)
    }

    AsyncFunction("signRequest") { payloadBase64: String ->
      Base64.encodeToString(keys.signWithDeviceKey(decodePayload(payloadBase64)), Base64.NO_WRAP)
    }

    AsyncFunction("deleteKeys") { ->
      keys.deleteAll()
    }
  }

  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  /**
   * `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)` mapped to the capability names (design,
   * signer table). Secure hardware is checked first so a phone that can never hold a key is told so
   * before being asked to enrol a fingerprint.
   */
  private fun capability(): String {
    if (!keys.secureHardwareAvailable()) {
      return "NO_SECURE_HARDWARE"
    }
    return when (BiometricManager.from(context).canAuthenticate(BIOMETRIC_STRONG)) {
      BiometricManager.BIOMETRIC_SUCCESS -> "STRONG_BIOMETRIC_READY"
      BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "NO_STRONG_BIOMETRIC_ENROLLED"
      // BIOMETRIC_ERROR_NO_HARDWARE, BIOMETRIC_ERROR_HW_UNAVAILABLE, BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED,
      // BIOMETRIC_ERROR_UNSUPPORTED and BIOMETRIC_STATUS_UNKNOWN (API 28–29 phones whose face unlock
      // the compat library cannot grade): no class-3 biometric the app can rely on.
      else -> "NO_STRONG_BIOMETRIC_HARDWARE"
    }
  }

  private fun requireStrongBiometric() {
    when (BiometricManager.from(context).canAuthenticate(BIOMETRIC_STRONG)) {
      BiometricManager.BIOMETRIC_SUCCESS -> return
      BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
        throw SignerException(SignerException.NO_STRONG_BIOMETRIC, "No fingerprint or face is enrolled on this phone")
      else ->
        throw SignerException(SignerException.NO_STRONG_BIOMETRIC, "This phone has no strong fingerprint or face unlock")
    }
  }

  private fun decodePayload(payloadBase64: String): ByteArray = try {
    Base64.decode(payloadBase64, Base64.DEFAULT)
  } catch (e: IllegalArgumentException) {
    throw SignerException(SignerException.INVALID_ARGUMENT, "payload must be Base64", e)
  }

  private fun decodeChallenge(challengeBase64: String): ByteArray = try {
    Base64.decode(challengeBase64, Base64.DEFAULT)
  } catch (e: IllegalArgumentException) {
    throw SignerException(SignerException.INVALID_ARGUMENT, "attestationChallenge must be Base64", e)
  }

  private fun signPunch(payload: ByteArray, prompt: PromptOptions, promise: Promise) {
    val activity = appContext.throwingActivity as? FragmentActivity
      ?: throw SignerException(SignerException.SIGNER_ERROR, "The current activity cannot host a biometric prompt")

    // Fails here with KEY_INVALIDATED / NO_KEYS before any prompt is shown.
    val signature = keys.initPunchSignature()

    val promptInfo = BiometricPrompt.PromptInfo.Builder()
      .setTitle(prompt.title)
      .apply { prompt.subtitle?.let { setSubtitle(it) } }
      // Required when DEVICE_CREDENTIAL is not allowed; tapping it is a cancellation.
      .setNegativeButtonText(prompt.cancelLabel)
      .setAllowedAuthenticators(BIOMETRIC_STRONG)
      .setConfirmationRequired(false)
      .build()

    val settled = AtomicBoolean(false)
    val callback = object : BiometricPrompt.AuthenticationCallback() {
      override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
        if (!settled.compareAndSet(false, true)) return
        val unlocked = result.cryptoObject?.signature
        if (unlocked == null) {
          // Succeeded without our CryptoObject: the key is still locked, so nothing can be signed.
          promise.reject(SignerException.BIOMETRIC_FAILED, "The biometric check did not unlock the punch key", null)
          return
        }
        try {
          unlocked.update(payload)
          val der = unlocked.sign()
          promise.resolve(Base64.encodeToString(der, Base64.NO_WRAP))
        } catch (e: KeyPermanentlyInvalidatedException) {
          promise.reject(SignerException.KEY_INVALIDATED, "The punch key was invalidated by a change to the phone's biometrics", e)
        } catch (e: Exception) {
          promise.reject(SignerException.BIOMETRIC_FAILED, "Signing after the biometric check failed: ${e.message}", e)
        }
      }

      override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
        if (!settled.compareAndSet(false, true)) return
        promise.reject(promptErrorCode(errorCode), errString.toString(), null)
      }

      override fun onAuthenticationFailed() {
        // One unrecognised attempt. The prompt stays open and the OS applies its own lockout,
        // which arrives as ERROR_LOCKOUT / ERROR_LOCKOUT_PERMANENT in onAuthenticationError.
      }
    }

    // BiometricPrompt must be created and shown on the main thread.
    activity.runOnUiThread {
      try {
        BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), callback)
          .authenticate(promptInfo, BiometricPrompt.CryptoObject(signature))
      } catch (e: Exception) {
        if (settled.compareAndSet(false, true)) {
          promise.reject(SignerException.BIOMETRIC_FAILED, "The biometric prompt could not be shown: ${e.message}", e)
        }
      }
    }
  }

  /** `BiometricPrompt.ERROR_*` → signer codes. Anything not listed is a failed check. */
  private fun promptErrorCode(errorCode: Int): String = when (errorCode) {
    BiometricPrompt.ERROR_NEGATIVE_BUTTON,
    BiometricPrompt.ERROR_USER_CANCELED,
    BiometricPrompt.ERROR_CANCELED -> SignerException.BIOMETRIC_CANCELLED
    BiometricPrompt.ERROR_LOCKOUT,
    BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> SignerException.BIOMETRIC_LOCKED_OUT
    BiometricPrompt.ERROR_NO_BIOMETRICS,
    BiometricPrompt.ERROR_HW_NOT_PRESENT,
    BiometricPrompt.ERROR_HW_UNAVAILABLE -> SignerException.NO_STRONG_BIOMETRIC
    // ERROR_TIMEOUT, ERROR_UNABLE_TO_PROCESS, ERROR_NO_SPACE, ERROR_VENDOR, ERROR_NO_DEVICE_CREDENTIAL,
    // ERROR_SECURITY_UPDATE_REQUIRED
    else -> SignerException.BIOMETRIC_FAILED
  }
}
