# Attendance app — manual device matrix (release sign-off)

Spec task 16.3 (`.kiro/specs/HR-module`, design "Testing Strategy" → device test matrix). The automated tests cover everything that runs in node; what they cannot cover is the phone's own hardware: the key store, the biometric prompt, enrolment changes, uninstall, mock locations and the radio. This checklist is run by a person on real phones before every Play release. iOS is built and checked but not released in this version (R4.11), so the two iPhone columns are recorded, not required to pass.

Every text in **Expect** is quoted from the code (`platform/attendance-protocol/src/messages.ts`, the screens in `src/screens`, `core/hr/src/model/labels.ts`, the backend `ErrorCode` table). A different wording is a failure, not a nit.

## 1. Devices

| Id  | Device                                                                | What it proves                                                                                                                                                                      |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | StrongBox phone (Pixel 3 or newer, Android 12+)                       | Keys land in StrongBox (`setIsStrongBoxBacked(true)` succeeds), the API 30+ gate `setUserAuthenticationParameters(0, AUTH_BIOMETRIC_STRONG)`                                        |
| D2  | TEE-only phone (a common Redmi or Samsung A-series, Android 10–13)    | `StrongBoxUnavailableException` fallback to the TEE; the same gate as D1                                                                                                            |
| D3  | Android 9 phone (API 28)                                              | The `minSdkVersion 28` floor; the API 28–29 gate `setUserAuthenticationValidityDurationSeconds(-1)`; `BiometricManager` compat behaviour                                            |
| D4  | Phone whose face unlock is rated weak (class 2) and has a fingerprint | Weak face is never accepted; the app falls back to fingerprint (decision D4, R2.7, R5.2). Can be the same hardware as D2 if its face unlock is class 2; record it as a separate run |
| D5  | iPhone with Face ID (iOS 15.1+)                                       | Secure Enclave `.biometryCurrentSet` key, no passcode fallback; build only (R4.11)                                                                                                  |
| D6  | iPhone with Touch ID (iOS 15.1+)                                      | Same as D5 with the other sensor; build only (R4.11)                                                                                                                                |

Read the per-device notes in section 4 before running a column; they say which steps differ or do not apply.

## 2. Before you start

**Builds.** Android: the `preview` profile from `eas.json` (`pnpm exec eas build --profile preview --platform android`), installed from the Play internal testing track or the `.aab`/`.apk` EAS produces. iOS: `pnpm exec expo prebuild --platform ios --clean && pnpm exec expo run:ios --device` on a Mac, or an EAS iOS `preview` build installed through TestFlight internal testing. The Secure Enclave, Face ID and Touch ID need a real device; the simulator reports `NO_SECURE_HARDWARE`. Write the build id / version (`Settings` screen → "App version") in the results table.

**Backend.** A test deployment of `inventory-api` (never production: step 20 edits code, steps 12–13 and 16 write deliberately bad punches). You need: the manager web UI, read access to its MongoDB (`mongosh`), the Grafana dashboard `inventory-api / 03 module` or the raw `/actuator/prometheus` page, and a backend you can redeploy for step 20.

**Shop set-up.** One shop with: HR Settings → Attendance card → **Biometric app check-in** on and **Location check** on with the shop's saved location and radius, outside action **Block** (step 12 switches it to **Allow and flag**); one current employee per device under test (named after the device so register rows are easy to tell apart); your manager login has "add and edit employees", "manage HR settings" and "mark and fix attendance". Do the run at the shop or within the radius; where that is impossible, set the radius wide enough to cover the test location and say so in the results.

**Phone set-up.** Screen lock set; at least one class-3 biometric enrolled (fingerprint on D1–D4; Face ID on D5; Touch ID on D6), except where a step says to remove it. Location permission "While using the app" and location services on. Android phones: Developer options on and `adb` working (`adb devices`). A mock-location app ("Fake GPS location" or similar from Play) installed on D1–D4 for steps 12–13. Correct automatic date and time (steps 14–16 rely on it).

**Tools.**

```sh
adb shell getprop ro.build.version.sdk            # 28 on D3, ≥ 31 on D1
adb shell pm list features | grep strongbox        # feature:android.hardware.strongbox_keystore on D1 only
adb logcat -s ReactNativeJS:* BiometricPrompt:* keystore2:* KeyStore:*   # while running steps 4–9
```

## 3. Checklist — run every step on every device

Steps are in the order that leaves the phone in the right state for the next one. "Server" lines name the check in section 5. Tick the results table (section 6) as you go; a step that does not apply to a device is marked `n/a`, never left blank.

### A. Pairing

**1. Capability gate names the setting (R2.7, R5.4).**
Remove every fingerprint and face from the phone (keep the PIN). Manager: employee page → Attendance app section → **Pair a phone** → the QR code and the 8 characters appear with a 15:00 countdown. Phone: open the app, type the 8 characters, tap **Continue**.
Expect: the notice "Turn on fingerprint or face unlock in Settings → Security, then try again." under the field; the code stays in the field; the manager's countdown keeps running (the code was not sent).
Server: `hr_pairing_codes` row for the employee still `status: "UNUSED"`, `attempts: 0`; no `inventory_hr_app_pairings_total{event="failed"}` increment. On D4 see section 4.

**2. Pair by QR (R2.3, R2.6, R2.8, R2.9, R5.1).**
Enrol one fingerprint (D1–D4), Face ID (D5) or Touch ID (D6). Phone: scan the manager's QR code with the in-app camera.
Expect, in order: the code appears in the field and the screen changes to **Is this you?** with "Shop" and "Employee" names matching the manager's screen → **Yes, this is me** → **Before we pair this phone** with the three headings "What is recorded", "What is never recorded", "Who can see it" and the lists `Your check-in and check-out time / How far from the shop you were / That your fingerprint or face check passed`, `Your fingerprint / Your face / Your exact location`, `The shop's managers can see your attendance` → **I agree** → no biometric prompt (key creation needs none) → **This phone is paired** with the same two names and "Open the app near the shop and tap the button to check in or out." → **Continue** → Home with the employee name, shop name, today's date as `Thu, 3 Apr 2025` and one button **Check in**.
Server: employee page reloads to "Paired · <phone model> · since <today> · no punches yet"; Settings card count rises by one and links to the employee list with "App paired" = Yes; `hr_device_pairings` row `status: "ACTIVE"`, `os`, `osVersion`, `phoneModel`, both public keys Base64 starting `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE` (91-byte P-256 SPKI, identical shape on Android and iOS), `consentVersion: 1`, `consents: [{version: 1, at}]`; `hr_audit_events` row `action: "DEVICE_PAIRED"` (section 5.3); `inventory_hr_app_pairings_total{event="created"}` and `{event="completed"}` each +1.

**3. Pair by typed code, lowercase and hyphenated (R2.3).**
Manager: **Unpair phone** → **Unpair this phone?** → confirm (the phone is now unpaired; step 18 tests what the phone shows for this, so for now just relaunch the app and accept the pairing screen). Manager: **Pair a phone** again and read the code out as the web shows it, `ABCD-EFGH`. Phone, three attempts:

- a. Type `abcd-efgh` (lowercase, with the hyphen) → **Continue**. Expect: the server accepts it and **Is this you?** appears. Tap **No, this isn't me**. Expect: back to the code field, field empty; on its next load the manager's card no longer shows the code (the server reports a pending code only while it is `UNUSED` or `CLAIMED`).
- b. Type a code with a character outside the alphabet, e.g. `ABCD-EFG0` or `ABCD-EFGI` (zero, capital i). Expect: "This code is not right. Check the 8 characters and try again." shown **without** a network call: the manager's `hr_pairing_codes` row is unchanged and `inventory_hr_app_pairings_total{event="failed",reason="code_wrong"}` does not move.
- c. Manager: **Pair a phone** (a fresh code, the one from (a) is `INVALIDATED` by "No"). Type it with a space in the middle, `abcd efgh`, and finish the pairing as in step 2.

Server after (a): `inventory_hr_app_pairings_total{event="failed",reason="abandoned"}` +1; the old code row `status: "INVALIDATED"`.

**4. Key lives in secure hardware (R5.1, R9.4).**
There is no diagnostics screen and the module writes no `KeyInfo` logcat line, so this is inferred from the code path that must have run for step 2 to succeed: `SignerKeyStore.generateInSecureHardware` creates each key (StrongBox first, TEE on `StrongBoxUnavailableException`), then reads `KeyInfo.securityLevel` (API 31+: `SECURITY_LEVEL_STRONGBOX`, `TRUSTED_ENVIRONMENT` or `UNKNOWN_SECURE`) or `KeyInfo.isInsideSecureHardware` (API 28–30); a key that fails this check is deleted and pairing stops with "This phone has no secure hardware for the Attendance app, so it cannot be paired." Also `capability()` returned `STRONG_BIOMETRIC_READY`, which first creates and deletes a probe key under the same check. On iOS the key is created with `kSecAttrTokenIDSecureEnclave`, so it cannot exist outside the enclave.
Do: confirm step 2 reached **This phone is paired** on this device, and record the hardware class: `adb shell pm list features | grep strongbox` prints `feature:android.hardware.strongbox_keystore` on D1 and nothing on D2–D4. On D5/D6 record the iPhone model (all supported models have a Secure Enclave).
Expect: pass by construction once step 2 passed; a device that shows the "no secure hardware" text cannot be in the matrix and is reported.

### B. Punching

**5. One prompt, no PIN or pattern fallback, cancel sends nothing (R4.2b, R4.2d, R5.2, R5.5).**
Home → tap **Check in**.
Expect: within a few seconds the phone's own biometric sheet titled "Confirm it is you" with the line "Use your fingerprint or face to record this punch" and one button, **Cancel**. Nowhere on the sheet is "Use PIN", "Use pattern", "Use password", "Enter Passcode" or any device-credential option, not even after a wrong finger or face. Tap **Cancel**. Expect: the red line "A fingerprint or face check is required to check in. Try again." under the button; the button still says **Check in**; Check-in and Check-out still "—".
Server: no row in `hr_punches` for the employee; `inventory_hr_app_punches_total` for the shop unchanged (nothing was sent).

**6. Wrong finger or face, then lockout (R4.2b).**
Tap **Check in** and present a finger or face that is not enrolled, repeatedly.
Expect: the sheet stays open on the first failures (the phone reports them, the app does nothing); after the OS lockout (five failures on Android, five on iOS) the sheet closes by itself and the app shows "A fingerprint or face check is required to check in. Try again." Nothing else changes. Wait out the lockout (30 s on Android; on iOS unlock the phone once with the passcode) before step 7.
Server: still no punch, counter unchanged.

**7. Accepted punch (R4.4, R4.7).**
Tap **Check in**, pass the biometric.
Expect: the green line "Checked in at HH:MM" where HH:MM is the **server's** clock in Asia/Kolkata (set the phone's clock 10 minutes off beforehand to prove the phone time was not used, then set it back); no flag line; Check-in row shows the same time; the button now reads **Check out**.
Server: daily register row shows the fingerprint icon (`aria-label` "by Attendance app") and no chip; employee page "last punch today HH:MM"; `hr_punches` row `source: "BIOMETRIC_APP"`, `pairingId`, `deviceModel`, `flags: []`; `inventory_hr_app_punches_total{result="accepted"}` +1.

**8. Second punch within 30 s still prompts; it is a duplicate (R5.3, R4.8).**
Within 30 seconds of step 7 tap **Check out**.
Expect: the biometric sheet appears **again** (one check per signature; nothing is cached from step 7). After passing it: "Checked out at HH:MM" and a second line "This is a duplicate of your earlier punch, so today's times did not change"; the Check-in time is unchanged, Check-out stays "—", the button stays **Check out**.
Server: day drawer lists two rows, the second greyed out with "Not counted (within 5 minutes of the last one)"; the register icon and times are unchanged; `inventory_hr_app_punches_total{result="duplicate"}` +1.

**9. Request signing never prompts (design DD2).**
Open **History**, go back, open **Settings**, go back.
Expect: both screens load (History lists the punches from steps 7–8 with date, HH:MM, "Check in" / "Check out") and no biometric sheet appears at any point: `/me` and `/punches` are signed with the device key, which has no user-authentication requirement.

### C. Enrolment change and reinstall

**10. New fingerprint or face enrolment invalidates the key (R5.9, design `KEY_INVALIDATED`).**
Phone settings: add a second fingerprint (D1–D4, D6) or reset and re-enrol Face ID (D5). Reopen the app.
Expect: Home opens normally (`/me` uses the device key). Tap **Check in**. On Android the key is checked before any sheet is shown (`KeyPermanentlyInvalidatedException` in `initSign`), so **no biometric sheet appears**; on iOS the sheet may appear once and then fail. Either way, within 5 seconds the app is on the pairing screen with the amber banner "Your phone's fingerprint or face settings changed, so this phone must be paired again. Ask your manager." above the code field. Kill and relaunch: still the pairing screen (everything was wiped).
Server: the pairing row is **still** `ACTIVE` and the employee page still says "Paired …" — the phone cannot tell the server about a local wipe. Re-pair (step 2 flow): the manager gets **Replace the old phone?** first; after **I agree** the old row is `UNPAIRED` with `unpairReason: "REPLACED"`, the audit row is `DEVICE_REPLACED` with `before.phoneModel`, and `inventory_hr_app_pairings_total{event="replaced"}` +1. Note "no biometric sheet" or "one failed sheet" in the results.

**11. Uninstall → reinstall → pairing screen (R5.9, R2.11).**
Uninstall the app, reinstall the same build, open it.
Expect on Android: the pairing screen with no banner (the secure store, the SQLite file and the Keystore entries went with the app). Pair again: the manager sees **Replace the old phone?** because the server still has the previous pairing `ACTIVE`; after completion the old row is `REPLACED` and the new row has a new `installationId` (visible only as a different hash-free UUID in the database; it is never shown in the UI).
Expect on iOS, the checkpoint 15 caveat: iOS does **not** delete Keychain items when an app is uninstalled, and both the `expo-secure-store` pairing record and the two Secure Enclave key references are Keychain items. The app may therefore open straight on **Home**, still paired, with the old `installationId`, and the old pairing still works. Record which of the two happened. This is not a release blocker because iOS is not released (R4.11); the design's iOS README (step 7 there, "Delete the app → reinstall → `hasKeys()` false") assumes the Android behaviour and must be corrected or the app must detect a reinstall itself before an iOS release. The owner decides.

### D. Location

**12. Mock location under Block (R4.6).** Android only; iOS has no mock flag (`mocked` is always false there) — mark D5/D6 `n/a`.
Developer options → "Select mock location app" → the fake-GPS app; start it with a position far from the shop. Shop still on **Block**. Tap **Check in**, pass the biometric.
Expect: the red line "Fake location detected" (exactly that, no second sentence); the Home times and button unchanged.
Server: nothing stored; `inventory_hr_app_punches_total{result="fake_location"}` +1. The daily register shows no new row for this punch.

**13. Mock location under Allow and flag (R4.6, R8.3–R8.6).**
Manager: Attendance card → outside action **Allow and flag** → save. Phone: repeat step 12 (still mocking).
Expect: "Checked in at HH:MM" (or "Checked out …", whichever the server decides) plus exactly one flag line "Fake location — your manager will see this"; no "Outside shop" line, no distance anywhere.
Server: daily register row chip **Fake location** (once, even after several mock punches); day drawer row `HH:MM · Attendance app · — · Fake location · <phone model>` ("—" because a mock punch stores no distance); "Flagged" filter on → the row is listed; `hr_punches` row `flags: ["FAKE_LOCATION"]`, `distanceMetres: null`; `inventory_hr_app_punches_total{result="flagged"}` +1. Then stop the mock app, clear the mock-location app in Developer options, and set the outside action back to **Block**.

### E. Poor network and offline

**14. Airplane-mode punch is saved on the phone (R6.1–R6.4, R6.16).**
Turn airplane mode on. Open the app (or return to Home).
Expect: the grey notice "The server could not be reached. A check-in now is saved on your phone and sent when you have network." Tap the button, pass the biometric (the sheet still appears: a punch is signed before it is saved).
Expect: "Saved on your phone. It will be sent when you have network."; the line "1 punch waiting to be sent" under the button within 1 second; the button label flips to the opposite of what you tapped (R6.4: the label follows the newest saved punch). Tap again, pass the biometric: "2 punches waiting to be sent", label flips back.
Server: nothing yet.

**15. Reconnect: the queue drains oldest first and the register shows "Recorded offline" (R6.5–R6.9).**
Turn airplane mode off and keep the app in the foreground.
Expect: within 5 seconds of the network returning (or up to 60 seconds if a send attempt ran in the previous minute) the waiting line changes to "1 punch waiting to be sent" and then disappears; no biometric sheet; no confirmation lines for queued punches (they were confirmed when saved). Open History and return to Home: the label and today's times are the server's.
Server: two new punches; each `hr_punches` row has `flags: ["RECORDED_OFFLINE"]`, `at` equal to `phoneTime` (the phone's clock at the tap, not the arrival time), ordered by phone time; the daily register row has the chip **Recorded offline** once; the day drawer rows read `HH:MM · Attendance app · <n> m from shop · Recorded offline · <phone model>`; History on the phone lists them with "Recorded offline — your manager will see this"; `inventory_hr_app_punches_total{result="offline_accepted"}` +2 (or `duplicate` for the second if it fell within 5 minutes of the first — record which); `inventory_hr_app_offline_backlog_total` unchanged unless you waited more than 1 hour before reconnecting (do that once per release on one device and confirm it rises by the number of punches sent).

**16. Refusal card with OK (R6.13–R6.14).**
Airplane mode on. Tap the button, pass the biometric → "Saved on your phone…", "1 punch waiting to be sent". Manager: Attendance card → **Biometric app check-in** off → save. Phone: airplane mode off.
Expect: within 5 seconds the waiting line disappears and a card appears in the notice area: first line `Thu, 3 Apr 2025 · HH:MM · Check in` (the phone's date, time and the direction the button showed), second line "Your shop has not turned on the Attendance app. Ask your manager to mark your attendance.", and an **OK** button. The card is not counted as waiting. Kill and relaunch: the card is still there. Tap **OK**: the card is gone and stays gone after another relaunch.
Server: nothing stored for that punch; `inventory_hr_app_punches_total{result="off"}` +1. Manager: switch **Biometric app check-in** back on.

### F. Unpairing

**17. "Remove this phone" without network keeps the pairing (R3.7–R3.8).**
Airplane mode on. Settings → **Remove this phone** → the inline question **Remove this phone?** with "Your shop will no longer accept check-ins from this phone, and everything the Attendance app saved on it is deleted. A manager can pair it again." and the buttons **Cancel** / **Yes, remove** → **Yes, remove**.
Expect: the red line "This phone could not be removed because the server could not be reached. Try again when you have network."; the Shop, Employee and App version rows are still filled; go back to Home and relaunch: still paired, still Home.
Server: pairing still `ACTIVE`; no audit row.

**18. "Remove this phone" with network (R3.7, R3.9).**
Airplane mode off. Settings → **Remove this phone** → **Yes, remove**.
Expect: the pairing screen within 5 seconds, no banner; relaunch → pairing screen.
Server: employee page "Not paired"; `hr_device_pairings` row `status: "UNPAIRED"`, `unpairedBy: "self"`, `unpairReason: "WORKER"`, `purgeAt` = `unpairedAt` + 90 days; audit row `DEVICE_UNPAIRED` with `actorUserId: "self"`, `reason: "WORKER"`, `before.phoneModel`; `inventory_hr_app_pairings_total{event="unpaired",reason="WORKER"}` +1. Re-pair (step 2) before step 19.

**19. Manager unpair → 403 → pairing screen within 5 s (R3.1–R3.3).**
Manager: employee page → **Unpair phone** → **Unpair this phone?** → confirm. The page shows "Not paired" at once. Phone (paired, on Home, with network): either leave Home and come back, or tap the button and pass the biometric.
Expect: within 5 seconds of that action the pairing screen with the banner "This phone is no longer paired. Ask your manager." and, on its own line below it, "Ask your manager to mark your attendance." (the server's text, R3.2, plus the R7.10 line the app appends). Relaunch: pairing screen. If a queued punch existed it is gone too (the whole store is wiped).
Server: `hr_device_pairings` row `UNPAIRED`, `unpairedBy: <manager user id>`, `unpairReason: "MANUAL"`; audit row `DEVICE_UNPAIRED` with the manager's `actorUserId`, `reason: "MANUAL"`, `before.phoneModel`, `before.os`, `before.pairedAt`. Every request the unpaired phone made before it wiped (`/me` or the punch) increments `inventory_hr_app_punches_total{result="signature_failed"}` by one: `AttendanceAppAuthInterceptor` counts an unknown or unpaired pairing as a signature failure (R5.8, R10.2) and feeds it to the health window, which with fewer than 20 attempts raises no alert. Note the count. Re-pair for step 20.

### G. Consent

**20. Re-consent gate after a RECONSENT_REQUIRED version bump (R9.12–R9.13).**
Consent versions live in code: `inventory-api` `core/hr/src/main/java/com/inventory/hr/service/ConsentVersions.java`, `VERSIONS`. On the **test** backend add a second entry `new ConsentVersion(2, Kind.RECONSENT_REQUIRED, …)` with one extra sentence in `recorded`, redeploy. Phone (paired on version 1): relaunch the app.
Expect: the screen **Updated consent** opens first, with "The consent text has changed. Please read it again before your next check-in." and the three lists including the new sentence; **I agree** / **Don't agree**. Tap **Don't agree**: the screen stays; there is no way to reach Home or punch. Tap **I agree**: Home. Relaunch: Home directly (no gate).
Server: `hr_device_pairings` row `consentVersion: 2`, `consents: [{version: 1, at}, {version: 2, at}]`; audit row `DEVICE_CONSENT_UPDATED`. Also confirm that a `WORDING_ONLY` version 3 does **not** show the gate (add it, redeploy, relaunch → Home). Remove the test versions afterwards.

### H. Build

**21. The build refuses a plain-HTTP API URL (R9.7).** Once per release, on the build machine, not on a phone.

```sh
cd apps/attendance
EXPO_PUBLIC_API_URL=http://api.example.in/api/v1 pnpm exec expo config --type public
```

Expect: the command fails with `EXPO_PUBLIC_API_URL must be an https:// URL (got "http://api.example.in/api/v1"). Set it in apps/attendance/.env or in the EAS environment for this build profile.` from `app.config.js`; the same text stops `expo prebuild` and `eas build`. With `EXPO_PUBLIC_API_URL=` (empty) the message shows `(got "")`. Then confirm the real `preview` and `production` EAS environments hold an `https://` value.

## 4. What differs per device

**D1 — StrongBox phone.** `adb shell pm list features | grep strongbox` prints the feature (step 4). Everything else is the common path. If step 2 fails with the "no secure hardware" text on a phone that has the feature, the StrongBox fallback is broken: capture `adb logcat -s keystore2:*` and report.

**D2 — TEE-only phone.** No StrongBox feature; the module catches `StrongBoxUnavailableException` (or a vendor `ProviderException` wrapping it) and generates in the TEE. Vendor biometric sheets (MIUI, One UI) replace the stock design; the check in step 5 is still "no PIN / pattern / password control anywhere on the sheet".

**D3 — Android 9 (API 28).** `getprop ro.build.version.sdk` = 28. The punch key uses `setUserAuthenticationValidityDurationSeconds(-1)` (per-use); the proof is step 8, the sheet on every punch. The sheet is the API 28 system `BiometricPrompt`. Two compat behaviours to expect: `BiometricManager` on API 28–29 cannot grade a face unlock, so a phone with **only** face enrolled is answered `NO_STRONG_BIOMETRIC_HARDWARE` → "This phone has no strong fingerprint or face unlock, so it cannot be paired." (step 1 shows this text instead of the "Turn on …" one if the phone has face but no fingerprint; record it); with a fingerprint enrolled the gate passes. Step 10 (new enrolment → `KEY_INVALIDATED`) must still hold: `setInvalidatedByBiometricEnrollment(true)` exists since API 24.

**D4 — weak face unlock only, plus a fingerprint sensor.** Step 1 variant: enrol **only** face unlock (no fingerprint) and type the code. Expect "Turn on fingerprint or face unlock in Settings → Security, then try again." (the phone has class-3 hardware, the fingerprint sensor, with nothing class-3 enrolled). Then enrol a fingerprint and pair. Steps 5–8: the sheet offers **fingerprint only**; the weak face never unlocks the key even if the phone's own lock screen uses face. Step 10 variant: adding a face re-enrolment alone must **not** invalidate the key (the key is tied to class-3 enrolment); adding a fingerprint must. Record both.

**D5 — iPhone, Face ID; D6 — iPhone, Touch ID.** Build only (R4.11): results are recorded, failures are filed, nothing blocks the Android release. Install from Xcode or TestFlight. Differences: step 1 expects the same "Turn on fingerprint or face unlock …" text after removing all Face ID / Touch ID enrolments (`LAError.biometryNotEnrolled` → `NO_STRONG_BIOMETRIC_ENROLLED`); step 5's sheet is the system Face ID / Touch ID sheet — after a failed match it must **not** show "Enter Passcode" (`.biometryCurrentSet` and an empty `localizedFallbackTitle`); step 6's lockout needs a passcode unlock of the phone to clear; step 10: `KEY_INVALIDATED` is raised after the sheet, not before, so expect one sheet that fails and then the pairing screen — a merely wrong finger must show "A fingerprint or face check is required …" instead (the module compares the stored enrolment state to tell the two apart; if a wrong finger wipes the pairing, that is a bug); step 11: the Keychain caveat above; steps 12–13: `n/a`; step 21 applies unchanged. The phone model reported to the server is "iPhone" (no `expo-device`), so the employee page reads "Paired · iPhone · …".

## 5. Server-side checks (exact places)

### 5.1 Register and employee screens (manager web UI)

| Where                                           | What to look at                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily register `/dashboard/hr/attendance`       | Source icon per row: fingerprint for the app (`data-source="BIOMETRIC_APP"`, accessible name "by Attendance app"), hand for a manual mark, phone for My HR. Chips after the mark: **Fake location**, **Recorded offline**, plus the existing **Outside shop**, **Location unclear**, **Missing check-out**, each at most once per row. Hint **No punch yet** next to a paired employee with no punch and no mark today (switch on). Filter bar: **Source** (Hand / My HR / Attendance app) and **Flagged** combine as AND. |
| Month register `/dashboard/hr/attendance/month` | Cell accessible name contains "Present, by Attendance app" for an app day (`<name>, <day>: Present, by Attendance app. Show day detail`). Click a cell → day drawer.                                                                                                                                                                                                                                                                                                                                                       |
| Day drawer (either register)                    | Every punch, time ascending: `HH:MM`, fingerprint icon + "Attendance app", then `<n> m from shop` or `—`, every flag in plain words (Outside shop, Location unclear, Fake location, Recorded offline), the phone model (blank for My HR), and `Not counted (within 5 minutes of the last one)` greyed out for a duplicate. **History** block below: `Mark changed: Unmarked → Present`, `<date time> by <name> · FORGOT_PHONE` (or `· OTHER: <text>`) for a hand mark on a paired employee.                                |
| Employee page → **Attendance app** section      | `Not paired` or `Paired · <model> · since <d Mon yyyy> · last punch today HH:MM` / `· no punches yet`; **Pair a phone** (then **Replace the old phone?** when paired) → QR + `ABCD-EFGH` + `mm:ss` countdown from 15:00; **Unpair phone** → **Unpair this phone?**.                                                                                                                                                                                                                                                        |
| Employee list `/dashboard/hr/employees`         | Column **App paired** Yes / No; filter All / Paired / Not paired (`?paired=true` from the settings card link).                                                                                                                                                                                                                                                                                                                                                                                                             |
| HR Settings → Attendance card                   | Switch **Biometric app check-in**; the line `N employees have a paired phone` (`1 employee has a paired phone`) linking to the filtered list; the warning "Workers can check in from anywhere. Turn on Location check to limit check-in to the shop." only when Location check is off.                                                                                                                                                                                                                                     |
| HR landing (`HrGetStartedCard`)                 | The signature-failure banner `<shop>: <r>% of Attendance app punches could not be verified in the last hour (<n> failed punches of <attempts>).` must **not** appear during this run: the only `signature_failed` increments are the one or two requests of an unpaired phone in steps 3 and 19, below the 20-attempt floor of R10.5. If it appears, stop and investigate `result="signature_failed"` below.                                                                                                               |

### 5.2 Database rows (`mongosh` on the test database)

Pairing audit rows are not shown on any manager screen in this version (the day drawer shows attendance rows only), so they are checked here.

```js
// the employee under test
const e = db.employees.findOne({ name: 'D1 StrongBox' })._id.toString();

// pairing state and what it stores (R2.15, R2.16: no phone number, IMEI, ad id, biometric)
db.hr_device_pairings.find({ employeeId: e }).sort({ createdAt: -1 }).limit(3);

// HR history for the pairing lifecycle: DEVICE_PAIRED / DEVICE_REPLACED / DEVICE_UNPAIRED /
// DEVICE_CONSENT_UPDATED / PAIRING_CODE_CREATED; rows carry actorUserId ("self" / "system" /
// a user id), reason (MANUAL / WORKER / REPLACED / EMPLOYEE_EXITED), before.phoneModel.
// Must never contain a key, an installationId or a coordinate (R9.1, R9.2).
db.hr_audit_events.find({ entityType: 'DevicePairing', employeeId: e }).sort({ at: -1 }).limit(10);

// punches: source, pairingId, deviceModel, phoneTime, flags; never lat/lng (R9.2)
db.hr_punches.find({ employeeId: e }).sort({ at: -1 }).limit(5);

// pairing codes: status UNUSED / CLAIMED / USED / CANCELLED / INVALIDATED, attempts; hash only
db.hr_pairing_codes.find({ employeeId: e });
```

Fail the run if any `hr_audit_events`, `hr_punches` or `hr_device_pairings` document contains `latitude`, `longitude`, `lat`, `lng`, a Base64 key outside the two `publicKey` fields of `hr_device_pairings`, or a UUID in an audit row.

### 5.3 Metrics and Grafana

Raw counters: `GET /actuator/prometheus` on the test backend, filter `inventory_hr_app`. Dashboard: Grafana → `inventory-api / 03 module`, pick the shop in the **shop** variable. The three panels and what this run should produce:

| Panel                                          | Query (as in `grafana/dashboards/03-module.json`)                                                                                    | Expected during the run                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attendance app punches per result**          | `sum by (result) (rate(inventory_hr_app_punches_total{shop=~"$shop"}[5m]))` plus a second series: the 1-hour signature-failure ratio | Series appear for `accepted` (7), `duplicate` (8, maybe 15), `fake_location` (12), `flagged` (13), `offline_accepted` (15), `off` (16) and `signature_failed` (one per request from the unpaired phone in steps 3 and 19, nothing else). The sum over `result` equals the attempts you made (R10.2). |
| **Attendance app offline backlog**             | `sum(increase(inventory_hr_app_offline_backlog_total{shop=~"$shop"}[1h]))`                                                           | Flat unless step 15 was run with a > 1 h gap; then it rises by the number of punches sent.                                                                                                                                                                                                           |
| **Attendance app pairing failures per reason** | `sum by (reason) (rate(inventory_hr_app_pairings_total{event="failed",shop=~"$shop"}[5m]))`                                          | `abandoned` (step 3a) only. `code_wrong` must **not** rise from step 3b (the app refused the code locally). Also check the raw counter for `event="created"`, `"completed"`, `"replaced"` (steps 10–11), `"unpaired"` with `reason="WORKER"` (18) and `"MANUAL"` (19).                               |

Server-side latency (R10.9–R10.10) is the k6 script's job (task 16.2), not this checklist's.

## 6. Results table

Copy once per release into the release ticket. One column per device; `P` pass, `F` fail (link the bug), `n/a` not applicable to that device (state why in the notes). The two iPhone columns are informational in this version.

| Step                                              | D1 StrongBox | D2 TEE-only | D3 Android 9 | D4 weak face | D5 iPhone Face ID | D6 iPhone Touch ID |
| ------------------------------------------------- | ------------ | ----------- | ------------ | ------------ | ----------------- | ------------------ |
| Device (make, model)                              |              |             |              |              |                   |                    |
| OS version / API level                            |              |             |              |              |                   |                    |
| App build (Settings → App version) / EAS build id |              |             |              |              |                   |                    |
| Backend build / commit                            |              |             |              |              |                   |                    |
| Tester                                            |              |             |              |              |                   |                    |
| Date                                              |              |             |              |              |                   |                    |
| 1 Capability gate names the setting               |              |             |              |              |                   |                    |
| 2 Pair by QR                                      |              |             |              |              |                   |                    |
| 3a Typed lowercase + hyphen accepted              |              |             |              |              |                   |                    |
| 3b Invalid character refused locally              |              |             |              |              |                   |                    |
| 3c Typed with a space, pairing completes          |              |             |              |              |                   |                    |
| 4 Key in secure hardware (class recorded)         |              |             |              |              |                   |                    |
| 5 Sheet, no PIN/pattern, cancel sends nothing     |              |             |              |              |                   |                    |
| 6 Wrong finger/face, lockout                      |              |             |              |              |                   |                    |
| 7 Accepted punch, server time                     |              |             |              |              |                   |                    |
| 8 Second punch within 30 s prompts, duplicate     |              |             |              |              |                   |                    |
| 9 History / Settings without a sheet              |              |             |              |              |                   |                    |
| 10 New enrolment → KEY_INVALIDATED → Pair         |              |             |              |              |                   |                    |
| 11 Uninstall → reinstall → Pair (iOS: record)     |              |             |              |              | caveat            | caveat             |
| 12 Mock location, Block                           |              |             |              |              | n/a               | n/a                |
| 13 Mock location, Allow and flag                  |              |             |              |              | n/a               | n/a                |
| 14 Airplane-mode punch saved, count line          |              |             |              |              |                   |                    |
| 15 Reconnect drains, Recorded offline             |              |             |              |              |                   |                    |
| 16 Refusal card with OK                           |              |             |              |              |                   |                    |
| 17 Remove this phone offline → kept               |              |             |              |              |                   |                    |
| 18 Remove this phone online → Pair                |              |             |              |              |                   |                    |
| 19 Manager unpair → 403 → Pair ≤ 5 s              |              |             |              |              |                   |                    |
| 20 Re-consent gate                                |              |             |              |              |                   |                    |
| 21 http:// API URL refused at build (once)        |              |             |              |              |                   |                    |
| 5.1 Register / employee screens checked           |              |             |              |              |                   |                    |
| 5.2 Database rows checked (no secrets, no coords) |              |             |              |              |                   |                    |
| 5.3 Metrics / Grafana checked                     |              |             |              |              |                   |                    |

Notes (step → device → what was seen, e.g. "10 → D5 → one failed Face ID sheet, then Pair"; "11 → D5 → opened on Home, Keychain kept the pairing"):

- …

Sign-off: Android release may proceed when every D1–D4 cell for steps 1–21 and 5.1–5.3 is `P` or a justified `n/a`, and the raw `signature_failed` counter moved only by the requests of the unpaired phone in steps 3 and 19.
