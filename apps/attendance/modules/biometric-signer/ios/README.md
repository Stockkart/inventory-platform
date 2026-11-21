# BiometricSigner — iOS

Swift half of the local Expo Module `modules/biometric-signer` (design DD2, DD4, DD5; R4.11, R5.1–R5.3, R5.12). The Kotlin half is in `../android`; the TypeScript surface is `../index.ts` and `../src/BiometricSigner.types.ts`. iOS is **built and tested, not released** in this version (R4.11).

## Files

| File                          | Job                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `BiometricSignerModule.swift` | The module (`Name("BiometricSigner")`), the `PromptOptions` record, `SignerException`, and `SignerKeychain` (keys, signing, error mapping) |
| `BiometricSigner.podspec`     | CocoaPods spec Expo autolinking picks up; iOS 15.1, depends on `ExpoModulesCore`, links `Security` and `LocalAuthentication`               |

`../expo-module.config.json` registers the class as `apple.modules: ["BiometricSignerModule"]`.

## Surface (identical to Android)

| Function                                                      | Result                                                                                                                                            | Rejection codes                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capability()`                                                | `STRONG_BIOMETRIC_READY` · `NO_SECURE_HARDWARE` · `NO_STRONG_BIOMETRIC_ENROLLED` · `NO_STRONG_BIOMETRIC_HARDWARE`                                 | —                                                                                                                                                          |
| `createKeys({ attestationChallenge? }?)`                      | `{ punchPublicKey, devicePublicKey }` (Base64 DER SPKI); the options are accepted and ignored: iOS returns no `punchAttestationChain` (task 16.4) | `NO_SECURE_HARDWARE`, `NO_STRONG_BIOMETRIC`, `SIGNER_ERROR`                                                                                                |
| `hasKeys()`                                                   | `boolean`                                                                                                                                         | —                                                                                                                                                          |
| `signPunch(payloadBase64, { title, subtitle?, cancelLabel })` | Base64 DER `ECDSA-Sig-Value`                                                                                                                      | `BIOMETRIC_FAILED`, `BIOMETRIC_CANCELLED`, `BIOMETRIC_LOCKED_OUT`, `KEY_INVALIDATED`, `NO_KEYS`, `NO_STRONG_BIOMETRIC`, `SIGNER_ERROR`, `INVALID_ARGUMENT` |
| `signRequest(payloadBase64)`                                  | Base64 DER `ECDSA-Sig-Value`                                                                                                                      | `NO_KEYS`, `SIGNER_ERROR`, `INVALID_ARGUMENT`                                                                                                              |
| `deleteKeys()`                                                | — (succeeds when already gone)                                                                                                                    | `SIGNER_ERROR`                                                                                                                                             |

Bytes cross the bridge as standard Base64 (RFC 4648 §4, padding, no line breaks): `Data(base64Encoded:)` / `base64EncodedString()`. `INVALID_ARGUMENT` and `SIGNER_ERROR` are not in the TypeScript union; `toBiometricSignerError` turns them into `SIGNER_UNAVAILABLE` with the native code kept in `nativeCode`.

## How the requirements are met

| Requirement                                 | Mechanism                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5.1 key in secure hardware, non-exportable | `SecKeyCreateRandomKey` with `kSecAttrTokenID = kSecAttrTokenIDSecureEnclave`, `kSecAttrKeyTypeECSECPrimeRandom`, 256 bits, `kSecAttrIsPermanent`. Secure Enclave private keys cannot be read out, backed up or restored to another device; `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` keeps every item out of backups       |
| R5.2 strong biometric only, no passcode     | Punch key access control `SecAccessControlCreateWithFlags(…, [.privateKeyUsage, .biometryCurrentSet])`. `.biometryCurrentSet` has no passcode path at all (unlike `.userPresence` / `.devicePasscode`); `localizedFallbackTitle = ""` also hides the fallback button. Face ID and Touch ID are both strong on iOS (D4)           |
| R5.3 one check per signature, ≤ 30 s        | `LAContext.touchIDAuthenticationAllowableReuseDuration = 0` on a fresh `LAContext` per call, attached with `kSecUseAuthenticationContext`; the enclave prompts for every `SecKeyCreateSignature`. Per-use is stricter than the 30 s the requirement allows; the app additionally discards a payload older than 30 s (design DD4) |
| R5.12 same signature scheme as Android      | `.ecdsaSignatureMessageX962SHA256` → DER `ECDSA-Sig-Value`; SPKI public keys (below). The server verifies both platforms with one code path                                                                                                                                                                                      |
| Key invalidated by enrolment change         | `.biometryCurrentSet` makes the key unusable when a finger is added/removed or Face ID is re-enrolled → `KEY_INVALIDATED` (mapping below)                                                                                                                                                                                        |
| Device key without prompt                   | Second Secure Enclave key with `[.privateKeyUsage]` only                                                                                                                                                                                                                                                                         |

### Signature format: DER, confirmed

`SecKeyAlgorithm.ecdsaSignatureMessageX962SHA256` is documented by Apple as "ECDSA signature of the message's SHA-256 digest, in X9.62 DER format" — an ASN.1 `SEQUENCE { r INTEGER, s INTEGER }` with minimal-length, positive INTEGERs. That is byte-for-byte what Android's `Signature.getInstance("SHA256withECDSA")` emits and what the server's `java.security.Signature("SHA256withECDSA")` verifies (`AppSignatures.verify`). The module passes the bytes through unchanged. Expect 70–72 bytes (`30 44 02 20 … 02 20 …` for the common case, one or two bytes longer when `r` or `s` needs a leading `00`). The IEEE P1363 `r ‖ s` (fixed 64 bytes) form is **not** what this API returns; `src/signer/der.ts` exists only for the WebCrypto test fake.

### Public key format: X9.63 → SPKI (26-byte header)

`SecKeyCopyExternalRepresentation` of an EC public key is the ANSI X9.63 uncompressed point `04 ‖ X(32) ‖ Y(32)` (65 bytes). The server stores X.509 `SubjectPublicKeyInfo`, so the module prefixes exactly these 26 bytes:

```text
30 59                                  SEQUENCE, 89 bytes
   30 13                               SEQUENCE, 19 bytes (AlgorithmIdentifier)
      06 07 2A 86 48 CE 3D 02 01       OID 1.2.840.10045.2.1   ecPublicKey
      06 08 2A 86 48 CE 3D 03 01 07    OID 1.2.840.10045.3.1.7 prime256v1 (secp256r1)
   03 42 00                            BIT STRING, 66 bytes, 0 unused bits
      04 ‖ X ‖ Y                       the 65 bytes from the enclave
```

Result: 91 bytes, Base64 beginning `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE`. Android's `PublicKey.getEncoded()` produces the identical 91-byte structure, so the server cannot tell the platforms apart by key shape. The constant is `SignerKeychain.p256SpkiHeader`.

### Capability mapping

`LAContext.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` after a Secure Enclave probe (a throwaway non-permanent enclave key; fails on hardware without an enclave and on simulators that do not emulate one):

| Condition                                                                                                      | `capability()`                 |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Enclave key cannot be created                                                                                  | `NO_SECURE_HARDWARE`           |
| Policy OK                                                                                                      | `STRONG_BIOMETRIC_READY`       |
| `LAError.biometryNotEnrolled`, `.passcodeNotSet`                                                               | `NO_STRONG_BIOMETRIC_ENROLLED` |
| `.biometryNotAvailable` (no sensor, or the user denied Face ID to this app), `.biometryLockout`, anything else | `NO_STRONG_BIOMETRIC_HARDWARE` |

### Error mapping for `signPunch`

1. An `LAError` in the `CFError` or its `NSUnderlyingErrorKey` chain is authoritative: `userCancel` / `appCancel` / `systemCancel` / `userFallback` → `BIOMETRIC_CANCELLED`; `authenticationFailed` → `BIOMETRIC_FAILED`; `biometryLockout` → `BIOMETRIC_LOCKED_OUT`; `biometryNotEnrolled` → `KEY_INVALIDATED`; `biometryNotAvailable` / `passcodeNotSet` → `NO_STRONG_BIOMETRIC`.
2. Otherwise the `OSStatus` (`NSOSStatusErrorDomain`): `errSecUserCanceled` (-128) → `BIOMETRIC_CANCELLED`; `errSecItemNotFound` (-25300) → `KEY_INVALIDATED`; `errSecAuthFailed` (-25293) → `BIOMETRIC_LOCKED_OUT` if the policy now reports a lockout, `KEY_INVALIDATED` if the policy reports nothing enrolled **or the enrolment state changed since the key was created**, else `BIOMETRIC_FAILED`; anything else → `SIGNER_ERROR`.
3. Key lookup: `errSecItemNotFound` for the punch key while the device key still exists → `KEY_INVALIDATED`; both missing → `NO_KEYS`.

Why the enrolment-state comparison: the Security framework reports a mismatched finger and an invalidated `.biometryCurrentSet` key with the same `errSecAuthFailed`. The app wipes the pairing on `KEY_INVALIDATED` (design, R9.6), so a wrong finger must never be reported as that. At `createKeys()` the module stores `LAContext.evaluatedPolicyDomainState` (an opaque hash of the enrolment, not a biometric) as a `kSecClassGenericPassword` item (`in.stockkart.attendance.signer` / `biometric-enrolment-state`, `ThisDeviceOnly`), and on `errSecAuthFailed` compares it with the current value: changed → `KEY_INVALIDATED`, same or unknown → `BIOMETRIC_FAILED`. The item is deleted with the keys. **Owner note:** this is one small item beyond the literal list in R9.3; it belongs to "the key pair" and holds no biometric or personal data.

### Threading

Every `AsyncFunction` runs on Expo's background function queue. `SecKeyCreateSignature` with a biometric-protected key blocks the calling thread while the Face ID / Touch ID sheet is on screen, which is why it must not run on the main thread.

### `mocked` on iOS

Not part of this module. iOS has no mock-location flag; `src/location/LocationReader.ts` (task 12.5) sends `mocked = false` on iOS, as the design states under Security assumptions.

## Verifying without Xcode on the dev machine

No Xcode is available in the Linux dev container, so the Swift is written against the Security / LocalAuthentication APIs but has not been compiled here. Verify on a Mac or on EAS:

```sh
# 1. Lint the podspec and compile the Swift in isolation (Mac with Xcode + CocoaPods)
cd apps/attendance/modules/biometric-signer/ios
pod lib lint BiometricSigner.podspec --allow-warnings --platforms=ios \
  --sources='https://cdn.cocoapods.org/' --include-podspecs='../../../node_modules/expo-modules-core/*.podspec'
#   (ExpoModulesCore is not on the CDN; --include-podspecs points at the workspace copy. If the
#    include path does not resolve, step 2 is the reliable check.)

# 2. Full iOS build on EAS (no Mac needed; uses the `preview` profile from eas.json)
cd apps/attendance
pnpm exec eas build --platform ios --profile preview

# 3. Local prebuild + Xcode build on a Mac
cd apps/attendance
pnpm exec expo prebuild --platform ios --clean
pnpm exec expo run:ios --device     # Secure Enclave and Face ID / Touch ID need a real device
```

Expected deprecation warnings (not errors): `evaluatedPolicyDomainState` (deprecated iOS 18, replacement `domainState.biometry.stateHash`). Treat any other warning as a bug.

### Device checks (part of `apps/attendance/TESTING.md`, task 16.x)

On a real iPhone (iOS 15+):

1. `capability()` → `STRONG_BIOMETRIC_READY` with Face ID / Touch ID enrolled; `NO_STRONG_BIOMETRIC_ENROLLED` after removing all enrolments; `NO_SECURE_HARDWARE` on a simulator without Secure Enclave emulation.
2. `createKeys()` → two 91-byte SPKI keys (Base64 starts `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE`); the server's `AppSignatures.verify` accepts a `signPunch` signature over a fixture payload from `platform/attendance-protocol/fixtures/canonical.json`.
3. `signPunch` shows the sheet with the prompt's title; **no "Enter Passcode" button** appears after a failed match (R5.2); cancel → `BIOMETRIC_CANCELLED`; wrong finger / face until the sheet gives up → `BIOMETRIC_FAILED`; locked out → `BIOMETRIC_LOCKED_OUT`.
4. Two `signPunch` calls one second apart each show the sheet (R5.3).
5. `signRequest` never shows a sheet.
6. Add a fingerprint or reset Face ID → next `signPunch` → `KEY_INVALIDATED`; `hasKeys()` may already be false.
7. Delete the app → reinstall → `hasKeys()` false, `signRequest` → `NO_KEYS` (R5.9).
