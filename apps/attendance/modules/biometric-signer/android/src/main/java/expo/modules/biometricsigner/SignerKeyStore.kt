package expo.modules.biometricsigner

import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.security.keystore.StrongBoxUnavailableException
import android.util.Base64
import android.util.Log
import java.security.InvalidKeyException
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.ProviderException
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.InvalidKeySpecException

/**
 * The two P-256 key pairs of a pairing inside `AndroidKeyStore` (design DD2, DD4; R5.1–R5.3, R9.4).
 *
 * - **Punch key** (`PUNCH_ALIAS`): `PURPOSE_SIGN`, SHA-256, user authentication required for every
 *   use by a class-3 biometric only (API 30+: `setUserAuthenticationParameters(0,
 *   AUTH_BIOMETRIC_STRONG)`; API 28–29: `setUserAuthenticationValidityDurationSeconds(-1)`), and
 *   invalidated when the biometric enrolment changes. The key store itself refuses to sign without
 *   a fresh biometric, so the gate does not depend on app code (R5.2, R5.3).
 * - **Device key** (`DEVICE_ALIAS`): same algorithm, no user authentication; signs request envelopes.
 *
 * Both are asked for StrongBox first and fall back to the TEE. A key the hardware reports as not
 * inside secure hardware is deleted again and the operation fails with `NO_SECURE_HARDWARE`.
 *
 * Key attestation (task 16.4): when `createKeys` is given a challenge, the punch key is generated
 * with `setAttestationChallenge(challenge)` and its certificate chain (`KeyStore.getCertificateChain`)
 * is returned for the server to verify against the Google roots. A key store that refuses the
 * challenge (some vendors, or no provisioned attestation key) falls back to a plain key and returns
 * no chain, so attestation never stops a phone from pairing.
 */
internal class SignerKeyStore(private val context: Context? = null) {
  companion object {
    private const val TAG = "BiometricSigner"
    const val PUNCH_ALIAS = "in.stockkart.attendance.punch"
    const val DEVICE_ALIAS = "in.stockkart.attendance.device"
    private const val PROBE_ALIAS = "in.stockkart.attendance.probe"
    private const val PROVIDER = "AndroidKeyStore"
    private const val CURVE = "secp256r1"

    /** DER `ECDSA-Sig-Value`, the same scheme the server verifies with (`AppSignatures.verify`). */
    const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
  }

  private val keyStore: KeyStore = KeyStore.getInstance(PROVIDER).apply { load(null) }

  /**
   * Emulator escape hatch for development only. The Android emulator's key store is software-backed,
   * so the secure-hardware rule (R5.1) can never pass there. When the host app is a *debuggable*
   * build (never a Play release) *and* the device is an emulator, software-backed keys are
   * tolerated and a warning is logged. A real phone running a debug build still needs secure
   * hardware, so the production rule is exercised on every physical device.
   */
  private val allowSoftwareKeyStore: Boolean by lazy {
    val debuggable = context?.applicationInfo?.flags?.and(ApplicationInfo.FLAG_DEBUGGABLE) != 0
    val emulator = isEmulator()
    val allow = debuggable && emulator
    if (allow) {
      Log.w(TAG, "Debug build on an emulator: accepting software-backed keys (R5.1 relaxed for development only)")
    }
    allow
  }

  private fun isEmulator(): Boolean =
    Build.FINGERPRINT.startsWith("generic") ||
      Build.FINGERPRINT.contains("emulator") ||
      Build.HARDWARE == "ranchu" ||
      Build.HARDWARE == "goldfish" ||
      Build.HARDWARE.contains("cutf") ||
      Build.PRODUCT.startsWith("sdk_gphone") ||
      Build.PRODUCT.startsWith("sdk_") ||
      Build.MODEL.contains("Android SDK built for") ||
      Build.MODEL.contains("Emulator")

  @Volatile
  private var secureHardwareProbe: Boolean? = null

  fun hasKeys(): Boolean =
    keyStore.containsAlias(PUNCH_ALIAS) && keyStore.containsAlias(DEVICE_ALIAS)

  /** Deletes both keys (and a leftover probe key). Succeeds when they are already gone. */
  fun deleteAll() {
    for (alias in listOf(PUNCH_ALIAS, DEVICE_ALIAS, PROBE_ALIAS)) {
      if (keyStore.containsAlias(alias)) {
        keyStore.deleteEntry(alias)
      }
    }
  }

  /**
   * True when this phone can create a key inside secure hardware. Decided once per process by
   * generating and deleting a throwaway key, because the key store only tells after the fact.
   */
  fun secureHardwareAvailable(): Boolean {
    secureHardwareProbe?.let { return it }
    val available = try {
      generateInSecureHardware(PROBE_ALIAS, biometricGated = false)
      true
    } catch (e: SignerException) {
      false
    } finally {
      if (keyStore.containsAlias(PROBE_ALIAS)) {
        keyStore.deleteEntry(PROBE_ALIAS)
      }
    }
    secureHardwareProbe = available
    return available
  }

  /** What `createKeys` returns: both public keys and, when attested, the punch key's chain. */
  data class CreatedKeys(
    val punchPublicKey: String,
    val devicePublicKey: String,
    /** Base64 DER X.509 certificates, leaf first; null when no challenge was given or the key store gave none. */
    val punchAttestationChain: List<String>?
  )

  /**
   * Creates both key pairs, replacing any existing ones, and returns their Base64 DER SPKI public
   * keys. With a non-null `attestationChallenge` the punch key is attested (see class comment).
   */
  fun createKeys(attestationChallenge: ByteArray? = null): CreatedKeys {
    deleteAll()
    var attested = attestationChallenge != null
    try {
      try {
        generateInSecureHardware(PUNCH_ALIAS, biometricGated = true, attestationChallenge = attestationChallenge)
      } catch (e: SignerException) {
        if (attestationChallenge == null || e.code != SignerException.NO_SECURE_HARDWARE) throw e
        // The key store refused to attest; a plain hardware key still pairs, just without a chain.
        attested = false
        if (keyStore.containsAlias(PUNCH_ALIAS)) keyStore.deleteEntry(PUNCH_ALIAS)
        generateInSecureHardware(PUNCH_ALIAS, biometricGated = true)
      }
      generateInSecureHardware(DEVICE_ALIAS, biometricGated = false)
    } catch (e: Exception) {
      deleteAll()
      throw e
    }
    return CreatedKeys(
      punchPublicKey = publicKeyBase64(PUNCH_ALIAS),
      devicePublicKey = publicKeyBase64(DEVICE_ALIAS),
      punchAttestationChain = if (attested) attestationChain(PUNCH_ALIAS) else null
    )
  }

  /** The certificate chain the key store holds for `alias`, Base64 DER, leaf first; null when it is only the self-signed placeholder. */
  private fun attestationChain(alias: String): List<String>? {
    val chain = keyStore.getCertificateChain(alias) ?: return null
    // Without attestation the key store holds exactly one self-signed certificate; an attested key has ≥ 2.
    if (chain.size < 2) return null
    return chain.map { Base64.encodeToString(it.encoded, Base64.NO_WRAP) }
  }

  /**
   * A `SHA256withECDSA` `Signature` initialised with the punch key, ready to be handed to
   * `BiometricPrompt` as a `CryptoObject`. `sign()` only succeeds after the prompt passed.
   */
  fun initPunchSignature(): Signature {
    val key = privateKey(PUNCH_ALIAS)
    val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
    try {
      signature.initSign(key)
    } catch (e: KeyPermanentlyInvalidatedException) {
      // A new fingerprint or face was enrolled, or all were removed (setInvalidatedByBiometricEnrollment).
      throw SignerException(SignerException.KEY_INVALIDATED, "The punch key was invalidated by a change to the phone's biometrics", e)
    } catch (e: InvalidKeyException) {
      throw SignerException(SignerException.SIGNER_ERROR, "The punch key cannot be used: ${e.message}", e)
    }
    return signature
  }

  /** DER signature of `bytes` by the device key; no user interaction. */
  fun signWithDeviceKey(bytes: ByteArray): ByteArray {
    val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
    try {
      signature.initSign(privateKey(DEVICE_ALIAS))
    } catch (e: InvalidKeyException) {
      throw SignerException(SignerException.SIGNER_ERROR, "The device key cannot be used: ${e.message}", e)
    }
    signature.update(bytes)
    return signature.sign()
  }

  private fun privateKey(alias: String): PrivateKey {
    val entry = try {
      keyStore.getEntry(alias, null)
    } catch (e: Exception) {
      throw SignerException(SignerException.SIGNER_ERROR, "The key store could not be read: ${e.message}", e)
    }
    return (entry as? KeyStore.PrivateKeyEntry)?.privateKey
      ?: throw SignerException(SignerException.NO_KEYS, "No pairing keys exist on this phone")
  }

  /** `PublicKey.getEncoded()` of an AndroidKeyStore EC key is already DER `SubjectPublicKeyInfo`. */
  private fun publicKeyBase64(alias: String): String {
    val certificate = keyStore.getCertificate(alias)
      ?: throw SignerException(SignerException.NO_KEYS, "No pairing keys exist on this phone")
    return Base64.encodeToString(certificate.publicKey.encoded, Base64.NO_WRAP)
  }

  private fun generateInSecureHardware(alias: String, biometricGated: Boolean, attestationChallenge: ByteArray? = null) {
    try {
      generate(alias, biometricGated, strongBox = true, attestationChallenge = attestationChallenge)
    } catch (e: StrongBoxUnavailableException) {
      generateWithoutStrongBox(alias, biometricGated, attestationChallenge)
    } catch (e: ProviderException) {
      // Some vendors wrap StrongBoxUnavailableException; anything else is a real key store failure.
      if (e.cause is StrongBoxUnavailableException) {
        generateWithoutStrongBox(alias, biometricGated, attestationChallenge)
      } else {
        throw SignerException(SignerException.NO_SECURE_HARDWARE, "The key store could not create a hardware-backed key: ${e.message}", e)
      }
    } catch (e: IllegalStateException) {
      // KeyGenParameterSpec requires an enrolled biometric for a per-use user-authenticated key.
      throw SignerException(SignerException.NO_STRONG_BIOMETRIC, "No fingerprint or face is enrolled on this phone", e)
    }
    if (!isInsideSecureHardware(alias) && !allowSoftwareKeyStore) {
      keyStore.deleteEntry(alias)
      throw SignerException(SignerException.NO_SECURE_HARDWARE, "This phone has no secure hardware for the Attendance app")
    }
  }

  private fun generateWithoutStrongBox(alias: String, biometricGated: Boolean, attestationChallenge: ByteArray? = null) {
    try {
      generate(alias, biometricGated, strongBox = false, attestationChallenge = attestationChallenge)
    } catch (e: IllegalStateException) {
      throw SignerException(SignerException.NO_STRONG_BIOMETRIC, "No fingerprint or face is enrolled on this phone", e)
    } catch (e: ProviderException) {
      throw SignerException(SignerException.NO_SECURE_HARDWARE, "The key store could not create a hardware-backed key: ${e.message}", e)
    }
  }

  private fun generate(alias: String, biometricGated: Boolean, strongBox: Boolean, attestationChallenge: ByteArray? = null): KeyPair {
    val builder = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
      .setAlgorithmParameterSpec(ECGenParameterSpec(CURVE))
      .setDigests(KeyProperties.DIGEST_SHA256)
    if (strongBox) {
      builder.setIsStrongBoxBacked(true)
    }
    if (attestationChallenge != null) {
      // Asks the secure hardware to sign a KeyDescription of this key (challenge, security level,
      // the authorisation list below) into the certificate chain; verified server-side (task 16.4).
      builder.setAttestationChallenge(attestationChallenge)
    }
    if (biometricGated) {
      builder.setUserAuthenticationRequired(true)
      builder.setInvalidatedByBiometricEnrollment(true)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        // Timeout 0 = authentication for every use; BIOMETRIC_STRONG only, never DEVICE_CREDENTIAL (R5.2).
        builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
      } else {
        // API 28–29: -1 = every use needs a biometric, presented through BiometricPrompt's CryptoObject.
        @Suppress("DEPRECATION")
        builder.setUserAuthenticationValidityDurationSeconds(-1)
      }
    }
    val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, PROVIDER)
    generator.initialize(builder.build())
    return generator.generateKeyPair()
  }

  private fun isInsideSecureHardware(alias: String): Boolean {
    val key = (keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry)?.privateKey ?: return false
    val info = try {
      KeyFactory.getInstance(key.algorithm, PROVIDER).getKeySpec(key, KeyInfo::class.java)
    } catch (e: InvalidKeySpecException) {
      return false
    }
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      when (info.securityLevel) {
        KeyProperties.SECURITY_LEVEL_STRONGBOX,
        KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT,
        KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE -> true
        else -> false // SECURITY_LEVEL_SOFTWARE, SECURITY_LEVEL_UNKNOWN
      }
    } else {
      @Suppress("DEPRECATION")
      info.isInsideSecureHardware
    }
  }
}
