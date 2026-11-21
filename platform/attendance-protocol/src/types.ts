/**
 * Wire types for the Attendance app, 1:1 with `com.inventory.hr.rest.dto` in `inventory-api`
 * (`AttendanceAppController`, `EmployeeController`, `HrSelfServiceController`). Shared by the
 * Expo app (`apps/attendance`) and the manager UI (`core/hr`) so the two cannot drift.
 *
 * Conventions (handbook `API_CONTRACT.md` FM1–FM5): instants are ISO strings, dates `yyyy-MM-dd`,
 * times `HH:mm` (Asia/Kolkata), enums travel as their constant names, ids are opaque 24-hex strings.
 * Fields the server may leave out or send as `null` are typed `?: T | null`, like `core/hr/model`.
 */

// ── Enums (string-literal unions of the backend constants) ───────────────────

/** Backend `PunchSource`: where a punch came from. `DEVICE_FILE` and `BRIDGE` stay reserved. */
export type PunchSource = 'SELF' | 'BIOMETRIC_APP' | 'DEVICE_FILE' | 'BRIDGE';

/** Backend `PunchFlag`: marks on a stored punch that managers see. */
export type PunchFlag =
  | 'OUTSIDE_SHOP'
  | 'LOW_ACCURACY'
  | 'NO_LOCATION'
  | 'LOCKED_PERIOD'
  | 'FAKE_LOCATION'
  | 'RECORDED_OFFLINE';

/** Backend `AttendanceSource`: where a stored day mark came from. */
export type AttendanceSource = 'MANUAL' | 'BULK_PRESENT' | 'SELF_CHECK_IN' | 'BIOMETRIC_APP';

/** Backend `PairingStatus`. */
export type PairingStatus = 'ACTIVE' | 'UNPAIRED';

/** Backend `UnpairReason`: why a pairing ended (R2.15). */
export type UnpairReason =
  | 'MANUAL'
  | 'WORKER'
  | 'REPLACED'
  | 'PAIRED_TO_ANOTHER_EMPLOYEE'
  | 'EMPLOYEE_EXITED';

/** Backend `ManualMarkReason`: the quick picks of the hand-mark reason prompt (R7.3). */
export type ManualMarkReason =
  | 'FORGOT_PHONE'
  | 'PHONE_NOT_WORKING'
  | 'NO_NETWORK'
  | 'BIOMETRIC_NOT_WORKING'
  | 'OTHER';

/** Backend `DeviceOs`. */
export type DeviceOs = 'ANDROID' | 'IOS';

/** Backend `PunchDirection`. */
export type PunchDirection = 'IN' | 'OUT';

/** Backend `OutsideAction`: what the Location check does with a punch outside the radius. */
export type OutsideAction = 'BLOCK' | 'FLAG';

/** Backend `PairingStateResponse.State`. */
export type PairingState = 'NOT_PAIRED' | 'PAIRED';

/** Backend `ConsentVersions.Kind` (R9.12). */
export type ConsentKind = 'RECONSENT_REQUIRED' | 'WORDING_ONLY';

/** Backend `AppPunchResponse.outcome`. */
export type AppPunchOutcome = 'STORED' | 'DUPLICATE' | 'REPLAYED';

// ── Pairing handshake: claim → complete | abandon (design DD7) ───────────────

/** `POST /api/v1/hr/attendance-app/pairings/claim` body (`ClaimPairingRequest`). */
export interface ClaimPairingRequest {
  /** 8 characters from the pairing-code alphabet, already normalised by the app. */
  code: string;
  /** UUID made by the app on first launch; a reinstall makes a new one (R2.11). */
  installationId: string;
  os: DeviceOs;
  /** As reported by the phone's operating system. */
  osVersion: string;
  /** ≤ 80 characters, as reported by the phone's operating system. */
  phoneModel: string;
  appVersion: string;
}

/** `ConsentVersions.ConsentVersion`: one published consent text, three plain-word lists (R2.8). */
export interface ConsentVersion {
  version: number;
  kind: ConsentKind;
  /** What is recorded. */
  recorded: string[];
  /** What is never recorded. */
  neverRecorded: string[];
  /** Who can see it. */
  visibility: string[];
}

/** `ClaimPairingResponse`: the names shown under "Yes, this is me" and the consent to show next. */
export interface ClaimPairingResponse {
  /** 32 random bytes, Base64url; valid until the code expires. */
  claimToken: string;
  shopName: string;
  employeeName: string;
  consent: ConsentVersion;
}

/** `POST /api/v1/hr/attendance-app/pairings/complete` body (`CompletePairingRequest`). */
export interface CompletePairingRequest {
  claimToken: string;
  installationId: string;
  /** Base64 DER `SubjectPublicKeyInfo`, P-256; the biometric-gated punch key (R5.1). */
  punchPublicKey: string;
  /** Base64 DER `SubjectPublicKeyInfo`, P-256; the device key that signs every other request. */
  devicePublicKey: string;
  /** The consent version the worker tapped "I agree" on. */
  consentVersion: number;
  /**
   * Optional (task 16.4): the Android key attestation chain of the punch key, Base64 DER X.509
   * certificates leaf first, made with the claim token as the attestation challenge. Omitted on iOS
   * and when the phone cannot produce one; the server verifies and records it, and does not refuse
   * a pairing over it in this version.
   */
  attestationChain?: string[];
}

/** `POST /api/v1/hr/attendance-app/pairings/abandon` body. */
export interface AbandonPairingRequest {
  claimToken: string;
}

/** `POST /api/v1/hr/attendance-app/pairings/abandon` response. */
export interface AbandonPairingResponse {
  abandoned: boolean;
}

/**
 * `AppLocationSettingsResponse`: the shop's Location check settings as the app needs them (design
 * DD6). The phone works out its distance from `shopLat`/`shopLng` itself and never sends
 * coordinates (R9.2).
 */
export interface AppLocationSettings {
  locationCheck: boolean;
  /** null when the location check is off or the shop location is not set. */
  shopLat?: number | null;
  /** null when the location check is off or the shop location is not set. */
  shopLng?: number | null;
  radiusMetres?: number | null;
  outsideAction?: OutsideAction | null;
}

/** `PairingBootstrapResponse`: everything the app stores about its pairing (R2.9, R9.3). */
export interface PairingBootstrap {
  /** Sent with every later request. */
  pairingId: string;
  shopId: string;
  employeeId: string;
  employeeName: string;
  shopName: string;
  location: AppLocationSettings;
  /** The consent version the worker just agreed to. */
  consentVersion: number;
}

// ── Signed app calls: status, punch, history, consent, unpair ────────────────

/** Consent state in `AppStatusResponse` (R9.13). */
export interface AppConsentState {
  latestVersion: number;
  /** A newer `RECONSENT_REQUIRED` version exists: show it before any new punch. */
  reconsentRequired: boolean;
  agreedVersion: number;
}

/** `GET /api/v1/hr/attendance-app/me` (`AppStatusResponse`): what the home screen shows (R4.1). */
export interface AppStatusResponse {
  employeeName: string;
  shopName: string;
  /** Today's attendance day, `yyyy-MM-dd`, Asia/Kolkata. */
  today: string;
  /** The shop's "Biometric app check-in" switch as the server read it for this answer (R1.3). */
  biometricApp: boolean;
  /** The server would accept a punch now (location aside: it is checked on the punch). */
  canPunch: boolean;
  /** Why not, in plain words; null when `canPunch`. */
  reason?: string | null;
  /** IN when nobody has a counted punch today yet, else OUT (My HR rule, R4.1a). */
  nextDirection: PunchDirection;
  /** HH:mm of the first counted punch today; null = none. */
  todayIn?: string | null;
  /** HH:mm of the last counted punch today when there are two or more; null = none. */
  todayOut?: string | null;
  location: AppLocationSettings;
  consent: AppConsentState;
}

/**
 * The ten fields of the `SKAT-PUNCH-1` canonical payload (design "Canonical payloads"), in
 * payload order. Signed by the punch key; the server rebuilds the same bytes and verifies (R5.6).
 * `distanceMetres` and `accuracyMetres` are null when no location was obtained or the location
 * check was off; the canonical line then reads `-`.
 */
export interface AppPunchFields {
  pairingId: string;
  shopId: string;
  employeeId: string;
  /** UUID v4, lowercase, with hyphens; made by the app, one per punch (R5.6). */
  punchId: string;
  /** `yyyy-MM-ddTHH:mm:ssZ`, UTC, whole seconds: the phone's clock at the tap. */
  phoneTime: string;
  /** true = saved on the phone while the server was not reachable (R6). */
  offline: boolean;
  /** true = the shop's Location check was on as the app last received it. */
  locationChecked: boolean;
  /** Whole metres from the shop, worked out on the phone; never raw coordinates (R9.2). */
  distanceMetres: number | null;
  /** Whole metres, the phone's reported accuracy. */
  accuracyMetres: number | null;
  /** true = the phone marked the reading as a mock (faked) location (R4.6). */
  mock: boolean;
}

/** `POST /api/v1/hr/attendance-app/punches` body (`AppPunchRequest`). */
export interface AppPunchRequest extends AppPunchFields {
  /** Base64 DER `ECDSA-Sig-Value` over the canonical punch payload, made by the punch key. */
  signature: string;
}

/** `AppPunchResponse`: what the confirmation screen shows after a stored punch (R4.7–R4.8). */
export interface AppPunchResponse {
  outcome: AppPunchOutcome;
  /** Decided by the server from today's stored punches; any phone-sent direction is ignored. */
  direction: PunchDirection;
  /** ISO instant: server time for an online punch, the phone's time for an offline one (R4.4, R6.9). */
  at: string;
  /** HH:mm of `at`, Asia/Kolkata. */
  atLocal: string;
  flags: PunchFlag[];
  /** true = within 5 minutes of a counted punch; today's times did not change (R4.8). */
  duplicate: boolean;
  todayIn?: string | null;
  todayOut?: string | null;
  nextDirection: PunchDirection;
}

/**
 * `PunchResponse`: one stored punch (`GET /attendance-app/punches`, `GET /attendance/punches`,
 * `GET /me/punches`).
 */
export interface PunchResponse {
  id: string;
  employeeId: string;
  /** ISO instant. */
  at: string;
  /** HH:mm of `at`, Asia/Kolkata. */
  time?: string | null;
  /** yyyy-MM-dd. */
  localDate?: string | null;
  source: PunchSource;
  direction: PunchDirection;
  /** Whole metres from the shop; null when the location check was off or no location given. */
  distanceMetres?: number | null;
  accuracyMetres?: number | null;
  flags?: PunchFlag[] | null;
  /** false = within 5 minutes of the previous counted punch, so it does not count. */
  counted?: boolean | null;
  /** Attendance app punches only: the phone model recorded at pairing (R8.6); null for My HR. */
  deviceModel?: string | null;
}

/** `POST /api/v1/hr/attendance-app/consent` body (R9.13). */
export interface ConsentRequest {
  version: number;
}

/** `POST /api/v1/hr/attendance-app/consent` response. */
export interface ConsentResponse {
  agreedVersion: number;
  /** ISO instant. */
  at: string;
}

/** `POST /api/v1/hr/attendance-app/pairings/me/unpair` response (R3.7). */
export interface UnpairResponse {
  unpaired: boolean;
}

// ── Manager and self pairing endpoints (`core/hr`) ──────────────────────────

/** `PairingStateResponse.PendingCode`: a code created for this employee still inside its 15 minutes. */
export interface PendingPairingCode {
  /** ISO instant. */
  expiresAt: string;
}

/**
 * `GET /api/v1/hr/employees/{id}/pairing` and `GET /api/v1/hr/me/pairing` (`PairingStateResponse`):
 * the Attendance app section of an employee's page (R2.2). Never carries a key or installation id.
 */
export interface PairingStateResponse {
  state: PairingState;
  /** PAIRED only: as reported by the phone at pairing. */
  phoneModel?: string | null;
  /** PAIRED only. */
  os?: DeviceOs | null;
  /** PAIRED only: ISO instant when pairing completed. */
  pairedAt?: string | null;
  /** PAIRED only: ISO instant of the last accepted punch; null = "no punches yet". */
  lastPunchAt?: string | null;
  /** PAIRED only: user id of the manager, or `"self"` (R2.13). */
  pairedBy?: string | null;
  /** PAIRED only: the consent version the worker agreed to. */
  consentVersion?: number | null;
  /**
   * PAIRED only (task 16.4): true when the phone's Android key attestation verified, false when a
   * chain was sent and failed, null when none was sent (iOS, older app). Informational only.
   */
  attested?: boolean | null;
  /** null = no code is pending. */
  pendingCode?: PendingPairingCode | null;
}

/**
 * `POST /api/v1/hr/employees/{id}/pairing-codes` and `POST /api/v1/hr/me/pairing-codes`
 * (`PairingCodeResponse`): a fresh one-time pairing code (R2.3).
 */
export interface PairingCodeResponse {
  /** 8 characters from the pairing-code alphabet. */
  code: string;
  /** `https://stockkart.in/attendance/pair#<CODE>`, what the QR encodes. */
  qrPayload: string;
  /** ISO instant, 15 minutes after creation. */
  expiresAt: string;
}

// ── Health (`GET /api/v1/hr/attendance-app/health`, R10.5) ──────────────────

/** One open signature-failure alert for a shop. */
export interface AppHealthAlert {
  shopId: string;
  /** Signature failures divided by app punches in the last 60 minutes. */
  rate: number;
  failed: number;
  attempts: number;
  /** ISO instant. */
  raisedAt: string;
}

/** `AppHealthResponse`: the alerts the HR dashboard panel shows. */
export interface AppHealthResponse {
  alerts: AppHealthAlert[];
}
