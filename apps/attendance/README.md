# @inventory-platform/attendance

**Status:** Android-releasable app (screens, signer module, offline queue and sync all wired; iOS builds and passes tests, not released)

The StockKart **Attendance app**: an Expo / React Native app a worker pairs with their employee record and then uses to record check-in and check-out punches after their phone's own fingerprint or face check (`.kiro/specs/HR-module`). Android ships first; the same code base builds for iOS (not released in this version).

## Versions and floors

| Item                           | Value                          | Why                                                                                                                     |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Expo SDK                       | 55 (`expo ~55.0.32`)           | Newest SDK whose iOS floor is 15.1 (SDK 56+ requires iOS 16.4) and whose React Native runs on the workspace's Node 20   |
| React Native / React           | 0.83.10 / 19.2.0               | `expo/bundledNativeModules.json` for SDK 55; React matches the rest of the workspace                                    |
| Android                        | `minSdkVersion 28` (Android 9) | R4.11; set through `expo-build-properties` in `app.json`                                                                |
| iOS                            | deployment target 15.1         | R4.11 ("iOS 15 and newer"); `expo-build-properties`                                                                     |
| Android package / slug         | `in.stockkart.attendance`      | `app.json`                                                                                                              |
| Node (tooling)                 | 20 (workspace)                 | `.github/workflows/ci.yml`                                                                                              |
| No `expo-local-authentication` | —                              | The biometric prompt is raised by the signer module so the prompt and the signature are one operation (design DD4, DD5) |

## Layout

```text
app.json            static Expo config: package ids, permissions, config plugins (build-properties, camera, location, secure-store, sqlite)
app.config.js       dynamic config: refuses to build unless EXPO_PUBLIC_API_URL is https:// (R9.7)
eas.json            EAS Build profiles `preview` (Play internal testing track) and `production`; EAS env vars supply EXPO_PUBLIC_API_URL
metro.config.js     pnpm-monorepo Metro setup: watchFolders = workspace root, nodeModulesPaths = app + root node_modules
babel.config.js     babel-preset-expo
index.ts            entry: imports src/config first, then registerRootComponent(App)
App.tsx             root component: createAppDeps() once, then RootNavigator
expo-env.d.ts       Expo ambient types (process.env.EXPO_PUBLIC_*)
src/config.ts       API_URL from EXPO_PUBLIC_API_URL, https:// enforced on import
src/app/deps.ts     composition root: binds every pure module to its Expo adapter; builds the PunchQueue + HistoryCache over one SQLite file, the SyncWorker (expoTriggers) under a SyncSupervisor and starts it, and PunchFlow with the reachability probe and `onQueued → sync.queueChanged()`
src/app/LaunchGate.ts, useLaunchGate.ts  start-up route: Pair / Consent (re-consent) / Home from the stored pairing and GET /me (R3.3, R5.9, R9.13)
src/navigation/RootNavigator.tsx  the one stack: pair → home → history → settings (+ consent); retry notice when the re-consent text could not be fetched; reruns the gate after a wipe reported by the sync worker
src/screens/        PairScreen, ConsentScreen, HomeScreen (label from /me or, while punches wait, from the newest queued punch; "N punches waiting to be sent"; refusal cards with OK), HistoryScreen, SettingsScreen
src/punch/PunchFlow.ts   one tap: reachability probe → location (when the last received Location check is on) → biometric signature of exactly one payload (`offline` from the probe) → POST /punches, or save to the queue with SAVED_OFFLINE when not reachable (R4.2, R6.1–R6.3)
src/punch/reachability.ts  "is the server there?" before the prompt: NetInfo connected, then GET /me with the 10 s timeout; any answer (a refusal included) = reachable (R6.1)
src/punch/expoNetwork.ts   NetInfo.fetch() bound as the probe's network reader
src/api/appClient.ts   fetch-only client for /hr/attendance-app/**: signed request envelope, 10 s timeout, refusal vs not-reachable (R6.1, R9.7, R9.8)
src/api/expoCrypto.ts  expo-crypto digest + UUID passed into AppClient on the phone (Hermes has no crypto.subtle)
src/state/pairingStore.ts  expo-secure-store record of the pairing + installationId; wipe() composes the queue and key deleters (R9.3, R9.6)
src/signer/         BiometricSigner interface, error class, native adapter, WebCrypto fake (see Signer below)
src/location/LocationReader.ts  read(timeoutMs, shop) → {distanceMetres, accuracyMetres, mocked} | 'NO_LOCATION'; haversine rounded like the server's GeoDistance, accuracy Math.ceil, mocked from Android; coordinates never leave the function (R4.2a, R4.5, R4.6, R9.2)
src/location/expoLocation.ts    expo-location bound as the LocationProvider (Accuracy.High); the one real `locationReader`
src/queue/db.ts         SqlDatabase (the expo-sqlite async slice the queue uses) and the punch_queue schema: payload = the ten signed fields, never coordinates (R9.2, R9.5)
src/queue/PunchQueue.ts enqueue, nextWaiting (oldest phone_time, only when next_attempt_at ≤ now), markAnswered (delete in one transaction), markRefused / dismissRefused, scheduleRetry, waitingCount, newestKnownDirection (R6.2–R6.16)
src/queue/memoryDb.ts   in-memory SqlDatabase that interprets the queue's SQL subset; tests and the sync-worker fakes run the real statements against it
src/queue/expoDb.ts     expo-sqlite bound as the queue's database; deleteQueueDatabase() is the `deleteQueue` step of pairingStore.wipe()
src/queue/SyncWorker.ts sends the queue: one attempt per trigger, never two within 60 s, one request in flight, oldest first; stored/duplicate/replayed → delete (+ history cache), refusal → REFUSED, HR_APP_NOT_PAIRED → wipe(), no answer → back-off 1, 2, 4, 8, 15 min; publishes {waiting, refused, newestDirection} for the home screen (R3.3, R6.4–R6.7, R6.13–R6.16)
src/queue/expoTriggers.ts  the worker's triggers on the phone: NetInfo "connected" edge, AppState foreground, expo-background-task (≥ 15 min, best effort; TaskManager.defineTask at module scope, as Expo requires)
src/queue/SyncSupervisor.ts  keeps one live SyncWorker per process: a worker stops for good when the server ends its pairing (R3.3), so the supervisor spawns and starts a fresh one and keeps the home screen's subscription and PunchFlow's queueChanged pointed at it (unpair → re-pair without closing the app)
modules/biometric-signer/  local Expo Module: Kotlin (android/) and Swift (ios/, task 12.3) behind one TS contract
vite.config.mts     vitest only (node environment); Nx infers the `test` target from it
```

## Signer (`src/signer`, `modules/biometric-signer`)

The only platform-specific code in the app (design DD5, R4.11, R5.12). Everything else calls the `BiometricSigner` interface:

| Method                      | Does                                                                                                                                                                                                                                                         | Rejects with                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `capability()`              | `STRONG_BIOMETRIC_READY` \| `NO_SECURE_HARDWARE` \| `NO_STRONG_BIOMETRIC_ENROLLED` \| `NO_STRONG_BIOMETRIC_HARDWARE`; checked before a pairing code is sent (R2.7, R5.4)                                                                                     | `SIGNER_UNAVAILABLE`                                                                            |
| `createKeys(options?)`      | Two P-256 key pairs in secure hardware (StrongBox, else TEE); returns both public keys as Base64 DER SPKI for `POST /pairings/complete`, plus `punchAttestationChain` on Android when `options.attestationChallenge` was given (see _Key attestation_ below) | `NO_SECURE_HARDWARE`, `NO_STRONG_BIOMETRIC`                                                     |
| `signPunch(bytes, prompt?)` | Raises the phone's strong biometric prompt (no PIN / pattern fallback) and signs with the **punch key**; one check per signature (R5.2, R5.3)                                                                                                                | `BIOMETRIC_FAILED`, `BIOMETRIC_CANCELLED`, `BIOMETRIC_LOCKED_OUT`, `KEY_INVALIDATED`, `NO_KEYS` |
| `signRequest(bytes)`        | Signs with the **device key**, no prompt (request envelopes, design DD2)                                                                                                                                                                                     | `NO_KEYS`                                                                                       |
| `deleteKeys()`              | Deletes both keys; fine when already gone (part of `wipe()`)                                                                                                                                                                                                 | —                                                                                               |

All rejections are `BiometricSignerError` with a `code` from that list (`SIGNER_UNAVAILABLE` for anything the native side reports outside it, with the original code in `nativeCode`). Signatures are DER `ECDSA-Sig-Value` over SHA-256 (what `SHA256withECDSA` verifies on the server); bytes cross the bridge as Base64.

| File                                                    | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/signer/BiometricSigner.ts`                         | Interface, `BiometricSignerError`, `toBiometricSignerError` (native code → error), `NativeBiometricSigner` (adapter over the module; the module object is injected)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/signer/nativeSigner.ts`                            | `biometricSigner`: the one real instance, bound to the linked module. Only app code imports it (needs `expo`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/signer/FakeBiometricSigner.ts`                     | In-memory signer with real WebCrypto P-256 keys and a scripted prompt (`nextPunchOutcomes`, `invalidatePunchKey()`); `verifyEcdsaSignature()` for tests of callers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/signer/der.ts`, `src/signer/base64.ts`             | `r‖s` ↔ DER `ECDSA-Sig-Value`; Base64 without `atob` / `btoa`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `modules/biometric-signer/src/BiometricSigner.types.ts` | The bridge contract both native implementations follow (no runtime imports)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `modules/biometric-signer/index.ts`                     | `requireNativeModule('BiometricSigner')`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `modules/biometric-signer/android/`                     | Kotlin. `SignerKeyStore`: AndroidKeyStore EC `secp256r1`, StrongBox then TEE, a key not inside secure hardware is deleted and refused; punch key `setUserAuthenticationRequired(true)`, API 30+ `setUserAuthenticationParameters(0, AUTH_BIOMETRIC_STRONG)`, API 28–29 `setUserAuthenticationValidityDurationSeconds(-1)`, `setInvalidatedByBiometricEnrollment(true)`, `setAttestationChallenge` when `createKeys` gets one (chain returned as `punchAttestationChain`). `BiometricSignerModule`: `BiometricPrompt` with `CryptoObject(Signature)`, `BIOMETRIC_STRONG` only, `BiometricManager.canAuthenticate` mapping, `KeyPermanentlyInvalidatedException` → `KEY_INVALIDATED` |
| `modules/biometric-signer/ios/`                         | Swift (task 12.3): Secure Enclave, `.biometryCurrentSet`, `LAContext` reuse 0; registers as `BiometricSignerModule` (see `expo-module.config.json`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Android notes: `androidx.biometric:biometric:1.1.0`. `BIOMETRIC_STATUS_UNKNOWN` (API 28–29 phones whose face unlock the compat library cannot grade) is reported as `NO_STRONG_BIOMETRIC_HARDWARE`, so those phones pair with a fingerprint. `capability()` decides `NO_SECURE_HARDWARE` by creating and deleting a probe key once per process, because the key store only reports the security level after a key exists. Native code is compiled by `expo prebuild` (the `prebuild:android` / `prebuild:ios` targets, see CI below) and by EAS; the TypeScript tests (`src/signer/*.test.ts`) cover error mapping, Base64 / DER, and a WebCrypto round trip verified both with `crypto.subtle` and with node's DER verifier, the same check as the server's `SHA256withECDSA`.

### Key attestation (task 16.4, recorded only)

What it is for: the server trusts that a punch was made by a biometric-gated key in secure hardware because the signature verifies against the `punchPublicKey` registered at pairing. Nothing in that proves _where_ the key lives; a modified app on a rooted phone could register a software key (design, Security assumption 2). Android key attestation closes that gap: the secure hardware itself signs a description of the key (security level, algorithm, curve, which authentication unlocks it, and a challenge the server chose) into the key's certificate chain, rooted in Google's attestation root.

What the app does: `PairingFlow.agree` calls `createKeys({ attestationChallenge: utf8Bytes(claimToken) })`. On Android `SignerKeyStore` generates the punch key with `setAttestationChallenge(challenge)` and returns `KeyStore.getCertificateChain(PUNCH_ALIAS)` as `punchAttestationChain` (Base64 DER X.509, leaf first). If the key store refuses to attest (no provisioned attestation key, some vendors), it falls back to a plain hardware key and returns no chain, so attestation never blocks pairing. iOS and `FakeBiometricSigner` ignore the option and return no chain. When a chain is present `PairingFlow` adds `attestationChain` to the `complete` request; otherwise the field is omitted and the request is byte-for-byte what it was before.

What the server verifies (`KeyAttestation` in `inventory-api`): the chain to a Google Hardware Attestation Root, `attestationSecurityLevel` ∈ {TrustedEnvironment, StrongBox}, the challenge equals the claim token, and the hardware-enforced list says SIGN-only, EC P-256, strong biometric with no `noAuthRequired` and `authTimeout` ≤ 30 s, and that the attested key is the `punchPublicKey`. The verdict is stored on the pairing (`attested` true / false / null in `PairingStateResponse`) and counted; **a failed or missing attestation does not refuse the pairing**. Enforcement, and anything like Play Integrity or iOS App Attest, is a later switch.

## Boundaries

- Nx tags `type:app`, `scope:attendance`. `scope:attendance` may depend on `scope:attendance` and `type:platform` only (root `eslint.config.mjs`).
- Workspace dependencies are exactly `@inventory-platform/attendance-protocol` and `@inventory-platform/contracts` (types). `eslint.config.mjs` bans `@inventory-platform/ui-kit`, `api-client` and `shell` by `no-restricted-imports`: they need the DOM, CSS modules, axios + `localStorage` or react-router.
- No `type: module` in `package.json`: Metro, Babel and Expo CLI read `metro.config.js`, `babel.config.js` and `app.config.js` as CommonJS.

## Environment

| Name                  | Purpose                | Read in                            | Set in                                                                                               |
| --------------------- | ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | inventory-api base URL | `src/config.ts` (inlined by Metro) | `apps/attendance/.env` locally (`.env-example`); EAS environment `preview` / `production` for builds |

`EXPO_PUBLIC_*` values are public in the bundle. Never put a secret in one.

## Commands

Run from the workspace root (inside the dev container when Nx is involved):

```sh
pnpm exec nx test attendance        # vitest, src/**/*.test.ts(x)
pnpm exec nx lint attendance
pnpm exec nx typecheck attendance   # tsc --build on tsconfig.app.json + tsconfig.spec.json
pnpm exec nx run attendance:prebuild:android   # expo prebuild + ./gradlew assembleDebug (needs JDK 17 + Android SDK)
pnpm exec nx run attendance:prebuild:ios       # expo prebuild + pod install + xcodebuild for the simulator (macOS only)

cd apps/attendance
cp .env-example .env                # then edit EXPO_PUBLIC_API_URL
pnpm exec expo config --type public # resolved config (fails without an https:// API URL)
pnpm exec expo prebuild --platform android
pnpm exec expo run:android          # needs the Android SDK; the signer module is native, so Expo Go cannot run the app
pnpm exec eas build --profile preview --platform android
```

There is no Nx `build` target; EAS builds the binaries that ship. The two `prebuild:*` targets (`package.json` → `nx.targets`) exist to prove the native projects generate and compile; both `dependsOn` `^build` so `attendance-protocol` is built first, and neither is cached.

## CI

`.github/workflows/attendance-app.yml` runs on pull requests and pushes to `main` that touch `apps/attendance/**` or `platform/attendance-protocol/**` (the general `ci.yml`, `eslint.yml` and `format.yml` still cover this project's `test`, `lint`, `typecheck` and Prettier on every change). Requirement R4.11: Android ships, iOS builds and passes the same tests without changes.

| Job       | Runner          | Runs                                                                                                                                                                                                                                                                     |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `android` | `ubuntu-latest` | `nx run-many -t test lint typecheck` for the app and `attendance-protocol`, then `nx run attendance:prebuild:android`: `expo prebuild --platform android --no-install` and `./gradlew assembleDebug` with JDK 17 (Temurin) and `android-actions/setup-android`           |
| `ios`     | `macos-latest`  | `nx run attendance:prebuild:ios`: `expo prebuild --platform ios --no-install`, `pod install`, then `xcodebuild -workspace ios/StockKartAttendance.xcworkspace -scheme StockKartAttendance -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build`. **Builds, not released.** |

Notes:

- `EXPO_PUBLIC_API_URL` is set to the placeholder `https://ci.invalid/api/v1` for the whole workflow because `app.config.js` refuses to prebuild without an `https://` URL. The CI binaries are never installed anywhere; real builds take the URL from the EAS environment named in `eas.json`.
- The Xcode workspace and scheme are named after `expo.name` with non-word characters removed (`StockKart Attendance` → `StockKartAttendance`). Renaming the app means updating the `prebuild:ios` target.
- Generated native projects (`apps/attendance/android`, `apps/attendance/ios`) are gitignored here and in the root `.prettierignore`; the hand-written native code lives in `modules/biometric-signer`.
- The `ios` job uses a GitHub-hosted macOS runner (`xcodebuild`, not EAS), so no Expo account or `EXPO_TOKEN` is needed in CI. If macOS runners become unavailable, the fallback is `eas build --platform ios --profile preview --no-wait` behind an `EXPO_TOKEN` secret, which compiles on EAS servers and still submits nothing (`eas.json` has no iOS `submit` entry).
- Releases: `eas.json` `preview` submits Android to the Play **internal** testing track; `production` submits a Play draft. iOS has build profiles only.

## Manual device checks (`TESTING.md`)

CI proves the code builds and the pure logic holds; it cannot exercise the phone's key store, biometric sheet, enrolment changes, uninstall, mock locations or the radio. [`TESTING.md`](./TESTING.md) is the release sign-off checklist for that (spec task 16.3): six devices (StrongBox, TEE-only, Android 9, weak-face-only, iPhone Face ID, iPhone Touch ID), 21 numbered steps with the exact texts the app and the manager UI must show, the server-side checks (register icons and chips, `hr_audit_events` rows, the three Grafana panels) and a results table. Run it on real phones before every Play release; the iPhone columns are recorded, not required (R4.11).

## Live contract test (`src/contract/liveBackend.contract.test.ts`)

Runs the app's real modules (`AppClient`, `PairingFlow`, `PunchFlow`, `PunchQueue` + `SyncWorker`, `loadHistory`, `agreeReconsent`, `removePhone`, `resolveLaunchRoute`, `PairingStore`) against a running `inventory-api` over HTTPS, with `FakeBiometricSigner` (real P-256 keys) standing in for the phone hardware. It proves the canonical punch payload, the signed envelope headers, the Base64 DER signature encoding and the DTO shapes agree between the TypeScript and Java sides, through the backend's real interceptor chain. The manager's side (sign up, register a shop, switch on, add an employee, pairing code) uses the Bearer endpoints, so no database access is needed.

It is **skipped** unless `ATTENDANCE_CONTRACT_URL` is set; `nx test attendance` never runs it in CI. The URL must be `https://` (the client refuses anything else, R9.7); a self-signed backend certificate is trusted through Node's `NODE_EXTRA_CA_CERTS`, nothing in the app is relaxed. Recipe used at checkpoint 15 (throwaway MongoDB + the packaged jar, bound to a private address):

```sh
# backend (inventory-api): keystore with the address the test will call in its SAN
keytool -genkeypair -alias api -keyalg EC -groupname secp256r1 -dname CN=contract -ext SAN=ip:127.0.0.1 \
  -storetype PKCS12 -keystore /tmp/tls.p12 -storepass changeit
keytool -exportcert -rfc -alias api -keystore /tmp/tls.p12 -storepass changeit -file /tmp/tls-cert.pem
DB_URI='mongodb://127.0.0.1:27018/contract?directConnection=true' CLIENT_URL=https://localhost ... \
  java -jar app/target/app-1.0.0.jar --server.address=127.0.0.1 --server.port=8443 --server.ssl.enabled=true \
  --server.ssl.key-store=/tmp/tls.p12 --server.ssl.key-store-password=changeit --server.ssl.key-store-type=PKCS12

# app
cd apps/attendance
NODE_EXTRA_CA_CERTS=/tmp/tls-cert.pem ATTENDANCE_CONTRACT_URL=https://127.0.0.1:8443/api/v1 \
  pnpm exec vitest run src/contract/
```

Each run signs up a fresh owner and shop (`contract-<stamp>@example.invalid`), so it needs no cleanup on a throwaway database and must not be pointed at a real one.

## Does not own

- Wire types, canonical payloads, pairing-code rules and message texts: `platform/attendance-protocol`
- The manager web UI: `core/hr`

## Testing on an emulator against a local HTTPS proxy

`plugins/withDebugUserCaTrust.js` makes **debug** builds trust CA certificates installed by the
tester on the device (release builds trust only the system store). That lets an Android emulator
reach a backend behind a local proxy with a private certificate, e.g. Caddy with `tls internal`
on the host (`https://10.0.2.2:8443` from the emulator). Install the proxy's root CA on the
emulator first (Settings → Security → More security settings → Install from device storage → CA
certificate). Cleartext HTTP stays forbidden in every variant (R9.7).

**Emulator note.** The Android emulator's key store is software-backed, so pairing on it fails
with "This phone has no secure hardware" (R5.1). `SignerKeyStore` relaxes that rule only when the
host app is a _debuggable_ build **and** the device is an emulator (both detected natively); a debug
build on a real phone, and every release build, still require secure hardware.
