import ExpoModulesCore
import Foundation
import LocalAuthentication
import Security

// MARK: - Module

/// iOS half of the `BiometricSigner` Expo Module (design DD2, DD4, DD5; R4.11, R5.1–R5.3, R5.12).
///
/// Exposes the same six functions, result shapes and rejection codes as the Kotlin module under
/// `../android`, so `src/signer/BiometricSigner.ts` does not know which platform it runs on. Bytes
/// cross the bridge as standard Base64 text (RFC 4648 §4, `+` `/`, `=` padding, no line breaks):
/// `Data(base64Encoded:)` / `base64EncodedString()` use exactly that alphabet.
///
/// Two P-256 keys live in the Secure Enclave (`kSecAttrTokenIDSecureEnclave`):
/// - **punch key**: access control `[.privateKeyUsage, .biometryCurrentSet]`; every signature
///   raises Face ID / Touch ID through an `LAContext` with
///   `touchIDAuthenticationAllowableReuseDuration = 0`, so one passed check unlocks one signature
///   (R5.3) and the passcode is never offered (R5.2: `.biometryCurrentSet` has no passcode path).
///   A change to the enrolled biometrics invalidates the key → `KEY_INVALIDATED`.
/// - **device key**: `[.privateKeyUsage]` only; signs request envelopes without a prompt.
///
/// `SecKeyCreateSignature(_, .ecdsaSignatureMessageX962SHA256, _, _)` hashes the message with
/// SHA-256 and returns the signature as a DER-encoded X9.62 `ECDSA-Sig-Value` (`SEQUENCE { r
/// INTEGER, s INTEGER }`), the same bytes Android's `SHA256withECDSA` produces and the server's
/// `AppSignatures.verify` (`java.security.Signature("SHA256withECDSA")`) reads. No conversion is
/// done here. See `README.md` in this folder for the verification notes.
///
/// Every `AsyncFunction` runs on Expo's background function queue, never on the main thread:
/// `SecKeyCreateSignature` blocks the calling thread while the biometric sheet is on screen.
public final class BiometricSignerModule: Module {
  private let keychain = SignerKeychain()

  public func definition() -> ModuleDefinition {
    Name("BiometricSigner")

    AsyncFunction("capability") { () -> String in
      return self.keychain.capability().rawValue
    }

    // `options` (task 16.4) is accepted so both platforms share one JS call shape, and ignored:
    // iOS has no key attestation chain to return (App Attest would be a separate, later feature),
    // so the result never carries `punchAttestationChain`.
    AsyncFunction("createKeys") { (_ options: CreateKeysOptions?) throws -> [String: String] in
      let keys = try self.keychain.createKeys()
      return [
        "punchPublicKey": keys.punchPublicKeySpkiBase64,
        "devicePublicKey": keys.devicePublicKeySpkiBase64,
      ]
    }

    AsyncFunction("hasKeys") { () -> Bool in
      return self.keychain.hasKeys()
    }

    AsyncFunction("signPunch") { (payloadBase64: String, prompt: PromptOptions) throws -> String in
      let payload = try Base64Text.decode(payloadBase64, argument: "payloadBase64")
      let signature = try self.keychain.signPunch(payload, prompt: prompt)
      return signature.base64EncodedString()
    }

    AsyncFunction("signRequest") { (payloadBase64: String) throws -> String in
      let payload = try Base64Text.decode(payloadBase64, argument: "payloadBase64")
      let signature = try self.keychain.signRequest(payload)
      return signature.base64EncodedString()
    }

    AsyncFunction("deleteKeys") { () throws -> Void in
      try self.keychain.deleteAll()
    }
  }
}

// MARK: - Records and exceptions

/// Wording for the system biometric sheet; mirrors `NativePromptOptions` in
/// `src/BiometricSigner.types.ts`. The module never chooses user-facing text itself.
/// Options of `createKeys`; mirrors `NativeCreateKeysOptions` in `../src/BiometricSigner.types.ts`.
/// Android uses `attestationChallenge`; iOS accepts the record and ignores it (see the function).
struct CreateKeysOptions: Record {
  @Field var attestationChallenge: String? = nil
}

struct PromptOptions: Record {
  @Field var title: String = ""
  @Field var subtitle: String? = nil
  /// Label of the cancel button on the sheet. Tapping it is `BIOMETRIC_CANCELLED`.
  @Field var cancelLabel: String = ""
}

/// A rejection with one of the codes `src/signer/BiometricSigner.ts` understands. Expo puts
/// `code` on the rejected JS error's `code` property and `reason` in its `message`.
final class SignerException: Exception {
  static let biometricFailed = "BIOMETRIC_FAILED"
  static let biometricCancelled = "BIOMETRIC_CANCELLED"
  static let biometricLockedOut = "BIOMETRIC_LOCKED_OUT"
  static let keyInvalidated = "KEY_INVALIDATED"
  static let noSecureHardware = "NO_SECURE_HARDWARE"
  static let noStrongBiometric = "NO_STRONG_BIOMETRIC"
  static let noKeys = "NO_KEYS"
  /// Anything the JS side has no specific handling for; it becomes `SIGNER_UNAVAILABLE` there.
  static let signerError = "SIGNER_ERROR"
  static let invalidArgument = "INVALID_ARGUMENT"

  private let signerCode: String
  private let signerReason: String

  init(
    _ code: String,
    _ reason: String,
    file: String = #fileID,
    line: UInt = #line,
    function: String = #function
  ) {
    self.signerCode = code
    self.signerReason = reason
    super.init(file: file, line: line, function: function)
  }

  override var code: String { signerCode }
  override var reason: String { signerReason }
}

/// What `capability()` reports; the raw values are the `NativeSignerCapability` union.
enum SignerCapability: String {
  case ready = "STRONG_BIOMETRIC_READY"
  case noSecureHardware = "NO_SECURE_HARDWARE"
  case noStrongBiometricEnrolled = "NO_STRONG_BIOMETRIC_ENROLLED"
  case noStrongBiometricHardware = "NO_STRONG_BIOMETRIC_HARDWARE"
}

struct SignerPublicKeys {
  let punchPublicKeySpkiBase64: String
  let devicePublicKeySpkiBase64: String
}

enum Base64Text {
  /// Strict standard Base64 (padding required, no whitespace). A malformed argument is a
  /// programming error on the JS side, so it is `INVALID_ARGUMENT`, never a user-facing code.
  static func decode(_ text: String, argument: String) throws -> Data {
    guard let data = Data(base64Encoded: text) else {
      throw SignerException(SignerException.invalidArgument, "\(argument) is not valid Base64")
    }
    return data
  }
}

// MARK: - Keychain

/// The two Secure Enclave key pairs of a pairing and the small bookkeeping item next to them.
///
/// Keychain layout (all `ThisDeviceOnly`, so nothing is included in an iCloud or encrypted
/// iTunes backup and nothing survives a restore to another phone, R5.1, R5.9):
///
/// | Item | Class | Identifier |
/// |---|---|---|
/// | punch private key | `kSecClassKey`, Secure Enclave | `kSecAttrApplicationTag` = `in.stockkart.attendance.punch` |
/// | device private key | `kSecClassKey`, Secure Enclave | `kSecAttrApplicationTag` = `in.stockkart.attendance.device` |
/// | biometric enrolment state | `kSecClassGenericPassword` | service `in.stockkart.attendance.signer`, account `biometric-enrolment-state` |
///
/// The enrolment state item holds `LAContext.evaluatedPolicyDomainState` as it was when the punch
/// key was created: an opaque hash of the phone's biometric enrolment, not a biometric itself. It
/// exists only to tell "this finger was not recognised" (`BIOMETRIC_FAILED`, retry) apart from
/// "the enrolment changed, so the key is gone for good" (`KEY_INVALIDATED`, re-pair), because the
/// Security framework reports both as `errSecAuthFailed`. Without it a wrong finger could wipe the
/// pairing. It is created and deleted together with the keys.
final class SignerKeychain {
  static let punchTag = Data("in.stockkart.attendance.punch".utf8)
  static let deviceTag = Data("in.stockkart.attendance.device".utf8)
  static let enrolmentService = "in.stockkart.attendance.signer"
  static let enrolmentAccount = "biometric-enrolment-state"

  /// DER `SubjectPublicKeyInfo` header for an uncompressed P-256 point. The Secure Enclave gives
  /// the public key as X9.63 `04 ‖ X ‖ Y` (65 bytes); the server (`AppSignatures.verify`) and the
  /// Android module exchange X.509 SPKI, so these 26 bytes are prefixed:
  ///
  /// ```
  /// 30 59                                  SEQUENCE, 89 bytes
  ///    30 13                               SEQUENCE, 19 bytes (AlgorithmIdentifier)
  ///       06 07 2A 86 48 CE 3D 02 01       OID 1.2.840.10045.2.1   (ecPublicKey)
  ///       06 08 2A 86 48 CE 3D 03 01 07    OID 1.2.840.10045.3.1.7 (prime256v1 / secp256r1)
  ///    03 42 00                            BIT STRING, 66 bytes, 0 unused bits
  ///       04 ‖ X(32) ‖ Y(32)               the 65 bytes from SecKeyCopyExternalRepresentation
  /// ```
  ///
  /// Total 91 bytes; Base64 of it starts with `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE`.
  static let p256SpkiHeader: [UInt8] = [
    0x30, 0x59,
    0x30, 0x13,
    0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01,
    0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07,
    0x03, 0x42, 0x00,
  ]
  static let x963UncompressedLength = 65

  private let lock = NSLock()
  private var secureEnclaveProbe: Bool?

  // MARK: Capability

  /// Secure hardware first (it decides whether any key can exist), then the biometric policy.
  /// Mapping of `LAError` from `canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)`:
  /// - `biometryNotEnrolled`, `passcodeNotSet` → `NO_STRONG_BIOMETRIC_ENROLLED` (fixable in Settings)
  /// - `biometryNotAvailable` (no sensor, or Face ID permission denied to this app),
  ///   `biometryLockout`, anything else → `NO_STRONG_BIOMETRIC_HARDWARE` ("cannot be used right now")
  /// Face ID and Touch ID are both strong on iOS (D4), so success is `STRONG_BIOMETRIC_READY`.
  func capability() -> SignerCapability {
    guard secureEnclaveAvailable() else {
      return .noSecureHardware
    }
    let context = LAContext()
    var error: NSError?
    if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
      return .ready
    }
    switch Self.laCode(of: error) {
    case .biometryNotEnrolled, .passcodeNotSet:
      return .noStrongBiometricEnrolled
    default:
      return .noStrongBiometricHardware
    }
  }

  /// Decided once per process by creating a throwaway, non-permanent Secure Enclave key: the
  /// framework offers no direct "is there a Secure Enclave" query. Fails on hardware without an
  /// enclave and on simulators that do not emulate one.
  func secureEnclaveAvailable() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if let known = secureEnclaveProbe {
      return known
    }
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: false,
      ],
    ]
    var error: Unmanaged<CFError>?
    let available = SecKeyCreateRandomKey(attributes as CFDictionary, &error) != nil
    secureEnclaveProbe = available
    return available
  }

  // MARK: Keys

  func hasKeys() -> Bool {
    return keyExists(tag: Self.punchTag) && keyExists(tag: Self.deviceTag)
  }

  /// Creates both key pairs, replacing any existing ones, and returns their Base64 DER SPKI public
  /// keys. Rejects with `NO_SECURE_HARDWARE` or `NO_STRONG_BIOMETRIC` before creating anything;
  /// a failure half-way deletes what was created so the phone never holds one key without the other.
  func createKeys() throws -> SignerPublicKeys {
    switch capability() {
    case .noSecureHardware:
      throw SignerException(
        SignerException.noSecureHardware,
        "This phone has no secure hardware for the Attendance app"
      )
    case .noStrongBiometricEnrolled:
      throw SignerException(
        SignerException.noStrongBiometric,
        "No Face ID or Touch ID is enrolled on this phone"
      )
    case .noStrongBiometricHardware:
      throw SignerException(
        SignerException.noStrongBiometric,
        "Face ID or Touch ID cannot be used on this phone right now"
      )
    case .ready:
      break
    }

    try deleteAll()
    do {
      let punchKey = try generateSecureEnclaveKey(
        tag: Self.punchTag,
        label: "StockKart Attendance punch key",
        flags: [.privateKeyUsage, .biometryCurrentSet]
      )
      let deviceKey = try generateSecureEnclaveKey(
        tag: Self.deviceTag,
        label: "StockKart Attendance device key",
        flags: [.privateKeyUsage]
      )
      try storeEnrolmentState()
      return SignerPublicKeys(
        punchPublicKeySpkiBase64: try spkiBase64(of: punchKey),
        devicePublicKeySpkiBase64: try spkiBase64(of: deviceKey)
      )
    } catch {
      try? deleteAll()
      throw error
    }
  }

  /// Deletes both keys and the enrolment state item. Succeeds when they are already gone.
  func deleteAll() throws {
    try deleteKey(tag: Self.punchTag)
    try deleteKey(tag: Self.deviceTag)
    try deleteEnrolmentState()
  }

  // MARK: Signing

  /// Raises Face ID / Touch ID and signs `payload` with the punch key. The prompt and the
  /// signature are one Security-framework operation: the key's access control makes the enclave
  /// refuse to sign unless the attached `LAContext` just authenticated with the current biometric
  /// set, so the gate does not depend on app code (DD4, R5.2, R5.3).
  func signPunch(_ payload: Data, prompt: PromptOptions) throws -> Data {
    let context = LAContext()
    // 0 = no reuse: every signature needs its own passed check, even one second after the last.
    context.touchIDAuthenticationAllowableReuseDuration = 0
    context.localizedReason = Self.reasonText(prompt)
    context.localizedCancelTitle = prompt.cancelLabel.isEmpty ? nil : prompt.cancelLabel
    // An empty fallback title hides the fallback button. `.biometryCurrentSet` never accepts the
    // passcode anyway; this only removes a button that could not do anything.
    context.localizedFallbackTitle = ""

    let key = try punchKey(context: context)
    var error: Unmanaged<CFError>?
    guard let signature = SecKeyCreateSignature(
      key,
      .ecdsaSignatureMessageX962SHA256,
      payload as CFData,
      &error
    ) else {
      throw mapPunchSigningError(error?.takeRetainedValue())
    }
    return signature as Data
  }

  /// Signs `payload` with the device key; no user interaction.
  func signRequest(_ payload: Data) throws -> Data {
    let key = try deviceKey()
    var error: Unmanaged<CFError>?
    guard let signature = SecKeyCreateSignature(
      key,
      .ecdsaSignatureMessageX962SHA256,
      payload as CFData,
      &error
    ) else {
      let detail = Self.describe(error?.takeRetainedValue())
      throw SignerException(SignerException.signerError, "The device key could not sign: \(detail)")
    }
    return signature as Data
  }

  // MARK: Key lookup

  private func punchKey(context: LAContext) throws -> SecKey {
    switch lookupKey(tag: Self.punchTag, context: context) {
    case .found(let key):
      return key
    case .notFound:
      // The device key is created in the same operation. If it is still there, the punch key did
      // not vanish with the pairing data: `.biometryCurrentSet` removed it after an enrolment change.
      if keyExists(tag: Self.deviceTag) {
        throw SignerException(
          SignerException.keyInvalidated,
          "The punch key was invalidated by a change to the phone's Face ID or Touch ID settings"
        )
      }
      throw SignerException(SignerException.noKeys, "No pairing keys exist on this phone")
    case .failed(let status):
      throw SignerException(
        SignerException.signerError,
        "The keychain could not be read: \(Self.describe(status))"
      )
    }
  }

  private func deviceKey() throws -> SecKey {
    switch lookupKey(tag: Self.deviceTag, context: nil) {
    case .found(let key):
      return key
    case .notFound:
      throw SignerException(SignerException.noKeys, "No pairing keys exist on this phone")
    case .failed(let status):
      throw SignerException(
        SignerException.signerError,
        "The keychain could not be read: \(Self.describe(status))"
      )
    }
  }

  private enum KeyLookup {
    case found(SecKey)
    case notFound
    case failed(OSStatus)
  }

  /// Fetching the key reference never prompts: `.privateKeyUsage` applies the access control to
  /// the signing operation, not to the lookup. The `LAContext` attached here through
  /// `kSecUseAuthenticationContext` is the one the enclave authenticates with when signing.
  private func lookupKey(tag: Data, context: LAContext?) -> KeyLookup {
    var query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrApplicationTag as String: tag,
      kSecReturnRef as String: true,
    ]
    if let context = context {
      query[kSecUseAuthenticationContext as String] = context
    }
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    switch status {
    case errSecSuccess:
      guard let item = item, CFGetTypeID(item) == SecKeyGetTypeID() else {
        return .failed(errSecInternalError)
      }
      // swiftlint:disable:next force_cast
      return .found(item as! SecKey)
    case errSecItemNotFound:
      return .notFound
    default:
      return .failed(status)
    }
  }

  private func keyExists(tag: Data) -> Bool {
    if case .found = lookupKey(tag: tag, context: nil) {
      return true
    }
    return false
  }

  // MARK: Key generation

  private func generateSecureEnclaveKey(
    tag: Data,
    label: String,
    flags: SecAccessControlCreateFlags
  ) throws -> SecKey {
    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(
      kCFAllocatorDefault,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      flags,
      &accessError
    ) else {
      let detail = Self.describe(accessError?.takeRetainedValue())
      throw SignerException(
        SignerException.signerError,
        "The key's access control could not be created: \(detail)"
      )
    }
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
      kSecAttrLabel as String: label,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrApplicationTag as String: tag,
        kSecAttrAccessControl as String: access,
      ],
    ]
    var error: Unmanaged<CFError>?
    guard let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
      let cfError = error?.takeRetainedValue()
      let detail = Self.describe(cfError)
      // The enclave refuses a `.biometryCurrentSet` key when no biometric is enrolled.
      if flags.contains(.biometryCurrentSet), Self.osStatus(of: cfError) == errSecAuthFailed {
        throw SignerException(
          SignerException.noStrongBiometric,
          "No Face ID or Touch ID is enrolled on this phone"
        )
      }
      throw SignerException(
        SignerException.noSecureHardware,
        "The Secure Enclave could not create a key: \(detail)"
      )
    }
    return key
  }

  private func deleteKey(tag: Data) throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
      kSecAttrApplicationTag as String: tag,
    ]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw SignerException(
        SignerException.signerError,
        "The key could not be deleted: \(Self.describe(status))"
      )
    }
  }

  /// `SecKeyCopyExternalRepresentation` of an EC public key is X9.63 `04 ‖ X ‖ Y`; prefixing
  /// `p256SpkiHeader` makes it the DER `SubjectPublicKeyInfo` the server stores (R5.1, DD3).
  private func spkiBase64(of privateKey: SecKey) throws -> String {
    guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
      throw SignerException(SignerException.signerError, "The public key could not be derived")
    }
    var error: Unmanaged<CFError>?
    guard let raw = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
      let detail = Self.describe(error?.takeRetainedValue())
      throw SignerException(SignerException.signerError, "The public key could not be exported: \(detail)")
    }
    guard raw.count == Self.x963UncompressedLength, raw.first == 0x04 else {
      throw SignerException(
        SignerException.signerError,
        "The public key is not an uncompressed P-256 point (\(raw.count) bytes)"
      )
    }
    var spki = Data(Self.p256SpkiHeader)
    spki.append(raw)
    return spki.base64EncodedString()
  }

  // MARK: Enrolment state

  /// `evaluatedPolicyDomainState` is only populated after a successful `canEvaluatePolicy`.
  /// (Deprecated in iOS 18 in favour of `domainState.biometry.stateHash`; it still works on every
  /// supported version and keeps this file free of availability branches.)
  private func currentEnrolmentState() -> Data? {
    let context = LAContext()
    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
      return nil
    }
    return context.evaluatedPolicyDomainState
  }

  private func storeEnrolmentState() throws {
    try deleteEnrolmentState()
    guard let state = currentEnrolmentState() else {
      throw SignerException(
        SignerException.noStrongBiometric,
        "The phone's biometric enrolment state could not be read"
      )
    }
    let attributes: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Self.enrolmentService,
      kSecAttrAccount as String: Self.enrolmentAccount,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      kSecValueData as String: state,
    ]
    let status = SecItemAdd(attributes as CFDictionary, nil)
    guard status == errSecSuccess else {
      throw SignerException(
        SignerException.signerError,
        "The enrolment state could not be stored: \(Self.describe(status))"
      )
    }
  }

  private func storedEnrolmentState() -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Self.enrolmentService,
      kSecAttrAccount as String: Self.enrolmentAccount,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else {
      return nil
    }
    return item as? Data
  }

  private func deleteEnrolmentState() throws {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Self.enrolmentService,
      kSecAttrAccount as String: Self.enrolmentAccount,
    ]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw SignerException(
        SignerException.signerError,
        "The enrolment state could not be deleted: \(Self.describe(status))"
      )
    }
  }

  /// True when the biometric enrolment differs from the one recorded when the punch key was
  /// created. Unknown (no stored or current state) counts as unchanged, so a failed match is
  /// reported as `BIOMETRIC_FAILED` and never wipes a pairing by mistake.
  private func enrolmentChanged() -> Bool {
    guard let stored = storedEnrolmentState(), let current = currentEnrolmentState() else {
      return false
    }
    return stored != current
  }

  // MARK: Error mapping

  /// Maps the `CFError` of a failed punch signature to a signer code.
  ///
  /// 1. An `LAError` anywhere in the error chain is authoritative: `userCancel` / `appCancel` /
  ///    `systemCancel` / `userFallback` → `BIOMETRIC_CANCELLED`; `authenticationFailed` →
  ///    `BIOMETRIC_FAILED`; `biometryLockout` → `BIOMETRIC_LOCKED_OUT`; `biometryNotEnrolled` →
  ///    `KEY_INVALIDATED` (all biometrics removed: a `.biometryCurrentSet` key is gone for good);
  ///    `biometryNotAvailable` / `passcodeNotSet` → `NO_STRONG_BIOMETRIC`.
  /// 2. Otherwise the `OSStatus`: `errSecUserCanceled` (-128) → `BIOMETRIC_CANCELLED`;
  ///    `errSecItemNotFound` (-25300) → `KEY_INVALIDATED`; `errSecAuthFailed` (-25293) →
  ///    `BIOMETRIC_LOCKED_OUT` when the policy now reports a lockout, `KEY_INVALIDATED` when the
  ///    enrolment state changed since the key was made or the policy reports nothing enrolled,
  ///    else `BIOMETRIC_FAILED` (the finger or face was not recognised); anything else →
  ///    `SIGNER_ERROR`.
  private func mapPunchSigningError(_ cfError: CFError?) -> SignerException {
    guard let cfError = cfError else {
      return SignerException(SignerException.signerError, "The punch key could not sign (no error details)")
    }
    let nsError = cfError as Error as NSError

    if let authCode = Self.laCode(in: nsError) {
      switch authCode {
      case .userCancel, .appCancel, .systemCancel, .userFallback:
        return SignerException(SignerException.biometricCancelled, "The Face ID or Touch ID check was cancelled")
      case .authenticationFailed:
        return SignerException(SignerException.biometricFailed, "The Face ID or Touch ID check did not pass")
      case .biometryLockout:
        return SignerException(SignerException.biometricLockedOut, "Face ID or Touch ID is locked out after too many attempts")
      case .biometryNotEnrolled:
        return SignerException(SignerException.keyInvalidated, "All Face ID or Touch ID enrolments were removed, so the punch key is invalid")
      case .biometryNotAvailable, .passcodeNotSet:
        return SignerException(SignerException.noStrongBiometric, "Face ID or Touch ID cannot be used on this phone right now")
      default:
        break
      }
    }

    switch Self.osStatus(of: cfError) {
    case errSecUserCanceled:
      return SignerException(SignerException.biometricCancelled, "The Face ID or Touch ID check was cancelled")
    case errSecItemNotFound:
      return SignerException(SignerException.keyInvalidated, "The punch key was invalidated by a change to the phone's Face ID or Touch ID settings")
    case errSecAuthFailed:
      let policy = LAContext()
      var policyError: NSError?
      let policyOk = policy.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError)
      if !policyOk {
        switch Self.laCode(of: policyError) {
        case .biometryLockout:
          return SignerException(SignerException.biometricLockedOut, "Face ID or Touch ID is locked out after too many attempts")
        case .biometryNotEnrolled:
          return SignerException(SignerException.keyInvalidated, "All Face ID or Touch ID enrolments were removed, so the punch key is invalid")
        default:
          break
        }
      }
      if enrolmentChanged() {
        return SignerException(SignerException.keyInvalidated, "The punch key was invalidated by a change to the phone's Face ID or Touch ID settings")
      }
      return SignerException(SignerException.biometricFailed, "The Face ID or Touch ID check did not pass")
    default:
      return SignerException(SignerException.signerError, "The punch key could not sign: \(Self.describe(cfError))")
    }
  }

  /// The `LAError.Code` of `error` when it is in `LAErrorDomain`, else nil.
  private static func laCode(of error: NSError?) -> LAError.Code? {
    guard let error = error, error.domain == LAErrorDomain else {
      return nil
    }
    return LAError.Code(rawValue: error.code)
  }

  /// The first `LAError.Code` found in `error` or its `NSUnderlyingErrorKey` chain.
  private static func laCode(in error: NSError) -> LAError.Code? {
    var current: NSError? = error
    var depth = 0
    while let candidate = current, depth < 8 {
      if let code = laCode(of: candidate) {
        return code
      }
      current = candidate.userInfo[NSUnderlyingErrorKey] as? NSError
      depth += 1
    }
    return nil
  }

  /// The `OSStatus` of a Security-framework `CFError` (domain `NSOSStatusErrorDomain`), else
  /// `errSecInternalError` so it falls through to `SIGNER_ERROR`.
  private static func osStatus(of cfError: CFError?) -> OSStatus {
    guard let cfError = cfError else {
      return errSecInternalError
    }
    let nsError = cfError as Error as NSError
    guard nsError.domain == NSOSStatusErrorDomain else {
      return errSecInternalError
    }
    return OSStatus(truncatingIfNeeded: nsError.code)
  }

  private static func describe(_ cfError: CFError?) -> String {
    guard let cfError = cfError else {
      return "unknown error"
    }
    let nsError = cfError as Error as NSError
    return "\(nsError.domain) \(nsError.code): \(nsError.localizedDescription)"
  }

  private static func describe(_ status: OSStatus) -> String {
    if let message = SecCopyErrorMessageString(status, nil) {
      return "\(status) \(message as String)"
    }
    return "\(status)"
  }

  /// Title and subtitle on one sheet: `LAContext` has a single reason line.
  private static func reasonText(_ prompt: PromptOptions) -> String {
    let title = prompt.title.trimmingCharacters(in: .whitespacesAndNewlines)
    let subtitle = (prompt.subtitle ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    switch (title.isEmpty, subtitle.isEmpty) {
    case (false, false):
      return "\(title)\n\(subtitle)"
    case (false, true):
      return title
    case (true, false):
      return subtitle
    case (true, true):
      // LocalAuthentication rejects an empty reason; this text is only reached by a caller that
      // passed no wording at all (the TypeScript side always sends `DEFAULT_SIGN_PROMPT`).
      return "Confirm it is you"
    }
  }
}
