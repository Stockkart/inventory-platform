/**
 * Attendance app pairing and health types for the manager UI. The wire shapes live in
 * `@inventory-platform/attendance-protocol` (design DD1) so the Expo app and this module cannot
 * drift; this file only re-exports what `core/hr` uses and adds the UI-side constants.
 */
export type {
  AppHealthAlert,
  AppHealthResponse,
  ConsentVersion,
  DeviceOs,
  PairingCodeResponse,
  PairingState,
  PairingStateResponse,
  PendingPairingCode,
} from '@inventory-platform/attendance-protocol';

/** A pairing code is valid for this long after creation (R2.3). */
export const PAIRING_CODE_TTL_MINUTES = 15;

/** `pairedBy` value of a pairing the linked employee made from My HR (R2.13). */
export const PAIRED_BY_SELF = 'self';

/** How often the HR landing re-reads `GET /attendance-app/health` (R10.5: within 5 minutes). */
export const APP_HEALTH_POLL_MS = 5 * 60_000;
