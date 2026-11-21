/**
 * The sentences the Attendance app shows word for word (R4.7, R6, R7.10 and the design's
 * error-code table). Server refusals arrive as `data.message` and are shown as received; the
 * mirrors here exist so the app can show the same text for a refusal it reproduces locally (for
 * example a code rejected before any network call) and so tests can assert the exact wording.
 *
 * Source of truth for server texts: `inventory-api` `ErrorCode` 8003–8034 and the
 * `SelfCheckInService` reason constants. Change them there first, then here.
 */
import type { PunchDirection, PunchFlag } from './types.js';

/** R7.10: the last line of every refusal the worker cannot fix themselves. */
export const ASK_MANAGER_TO_MARK = 'Ask your manager to mark your attendance.';

/** Backend `ErrorCode` names that an app request can receive. */
export type AppErrorCode =
  | 'HR_APP_OFF'
  | 'HR_APP_NOT_PAIRED'
  | 'HR_APP_NOT_VERIFIED'
  | 'HR_APP_TOO_LATE'
  | 'HR_APP_CLOCK_WRONG'
  | 'HR_FAKE_LOCATION'
  | 'HR_TOO_MANY_ATTEMPTS'
  | 'HR_PAIRING_CODE_EXPIRED'
  | 'HR_PAIRING_CODE_USED'
  | 'HR_PAIRING_CODE_CANCELLED'
  | 'HR_PAIRING_CODE_WRONG'
  | 'HR_PAIRING_EMPLOYEE_EXITED'
  | 'HR_PAIRING_CODE_LOCKED'
  | 'HR_OUTSIDE_SHOP'
  | 'HR_LOCATION_UNCLEAR'
  | 'HR_EMPLOYEE_NOT_EMPLOYED'
  | 'HR_DAY_HAS_LEAVE'
  | 'HR_PERIOD_LOCKED';

/**
 * Server refusal texts by `ErrorCode` name. `HR_PAIRING_CODE_LOCKED` is a template; use
 * {@link pairingCodeLockedMessage}. The three My HR refusals (not employed, on leave, locked) carry
 * the `SelfCheckInService` sentence the server sends for a punch, not the generic `ErrorCode` text.
 */
export const SERVER_MESSAGES: Readonly<Record<AppErrorCode, string>> = {
  HR_APP_OFF: `Your shop has not turned on the Attendance app. ${ASK_MANAGER_TO_MARK}`,
  HR_APP_NOT_PAIRED: 'This phone is no longer paired. Ask your manager.',
  HR_APP_NOT_VERIFIED: `This phone could not be verified. Ask your manager to re-pair it. ${ASK_MANAGER_TO_MARK}`,
  HR_APP_TOO_LATE: `Too late to send this check-in. ${ASK_MANAGER_TO_MARK}`,
  HR_APP_CLOCK_WRONG:
    "Your phone's clock is wrong. Fix the time, then ask your manager to mark your attendance.",
  HR_FAKE_LOCATION: 'Fake location detected',
  HR_TOO_MANY_ATTEMPTS: 'Too many attempts, wait a minute',
  HR_PAIRING_CODE_EXPIRED: 'This code has expired. Ask your manager for a new one.',
  HR_PAIRING_CODE_USED: 'This code has already been used.',
  HR_PAIRING_CODE_CANCELLED: 'This code was cancelled. Ask your manager for a new one.',
  HR_PAIRING_CODE_WRONG: 'This code is not right. Check the 8 characters and try again.',
  HR_PAIRING_EMPLOYEE_EXITED: 'This employee has left the shop, so the phone cannot be paired.',
  HR_PAIRING_CODE_LOCKED: 'Too many wrong codes. Wait %d minutes and try again.',
  HR_OUTSIDE_SHOP: "You're not at the shop",
  HR_LOCATION_UNCLEAR: 'Location is not clear, please try again near a window',
  HR_EMPLOYEE_NOT_EMPLOYED: "You are not employed on today's date",
  HR_DAY_HAS_LEAVE: 'You are on approved leave today',
  HR_PERIOD_LOCKED: 'Payroll for this month is finalised, so attendance cannot be recorded',
};

/** The `HR_PAIRING_CODE_LOCKED` text with the minutes to wait filled in (R2.5). */
export function pairingCodeLockedMessage(minutes: number): string {
  return SERVER_MESSAGES.HR_PAIRING_CODE_LOCKED.replace(
    '%d',
    String(Math.max(1, Math.ceil(minutes))),
  );
}

/**
 * R7.10: the refusals the worker cannot fix themselves end with {@link ASK_MANAGER_TO_MARK}. The
 * server already appends it to all of them except `HR_APP_NOT_PAIRED`, whose text R3.2 fixes; the
 * app adds the line to that one itself (design, API notes).
 */
export const REFUSALS_ENDING_WITH_ASK_MANAGER: readonly AppErrorCode[] = [
  'HR_APP_OFF',
  'HR_APP_NOT_PAIRED',
  'HR_APP_NOT_VERIFIED',
  'HR_APP_TOO_LATE',
];

/** True when the message's last line is exactly {@link ASK_MANAGER_TO_MARK} (R7.10). */
export function endsWithAskManagerToMark(message: string): boolean {
  const lines = message.trimEnd().split('\n');
  const last = lines[lines.length - 1].trim();
  return last === ASK_MANAGER_TO_MARK || last.endsWith(` ${ASK_MANAGER_TO_MARK}`);
}

/** The message with {@link ASK_MANAGER_TO_MARK} as its last line, added when not already there. */
export function withAskManagerToMark(message: string): string {
  return endsWithAskManagerToMark(message)
    ? message
    : `${message.trimEnd()}\n${ASK_MANAGER_TO_MARK}`;
}

/** What the app shows for a server refusal by code; falls back to the server's own text. */
export function refusalText(code: string, serverMessage?: string | null): string {
  const text =
    serverMessage && serverMessage.trim().length > 0
      ? serverMessage
      : (SERVER_MESSAGES as Record<string, string | undefined>)[code] ??
        'Something went wrong. Try again.';
  return code === 'HR_APP_NOT_PAIRED' ? withAskManagerToMark(text) : text;
}

// --- confirmation screen (R4.7, R4.8) ---

/** "Checked in at 09:12" / "Checked out at 18:05"; `atLocal` is HH:MM, Asia/Kolkata. */
export function punchConfirmation(direction: PunchDirection, atLocal: string): string {
  return `${direction === 'IN' ? 'Checked in' : 'Checked out'} at ${atLocal}`;
}

const FLAG_SUFFIX = ' — your manager will see this';

/** One plain sentence per flag on a stored punch, shown one per line under the confirmation. */
export const FLAG_SENTENCES: Readonly<Partial<Record<PunchFlag, string>>> = {
  OUTSIDE_SHOP: `Outside shop${FLAG_SUFFIX}`,
  LOW_ACCURACY: `Location unclear${FLAG_SUFFIX}`,
  NO_LOCATION: `No location${FLAG_SUFFIX}`,
  FAKE_LOCATION: `Fake location${FLAG_SUFFIX}`,
  RECORDED_OFFLINE: `Recorded offline${FLAG_SUFFIX}`,
};

/**
 * The sentence for a flag. A flag this version does not know (a newer backend) is still shown,
 * as its constant name in plain words, so the app never hides a flag or crashes on one.
 */
export function flagSentence(flag: PunchFlag | string): string {
  const known = (FLAG_SENTENCES as Record<string, string | undefined>)[flag];
  if (known) {
    return known;
  }
  const words = flag.toLowerCase().replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}${FLAG_SUFFIX}`;
}

/** Added under the confirmation when the punch is a duplicate of an earlier one (R4.8). */
export const DUPLICATE_SENTENCE =
  "This is a duplicate of your earlier punch, so today's times did not change";

// --- messages the app decides itself ---

/** R4.2d, R5.5: biometric failed, cancelled or locked out; nothing stored or sent. */
export const BIOMETRIC_REQUIRED = 'A fingerprint or face check is required to check in. Try again.';

/** The signing key was invalidated by a change to the phone's biometrics (design addition). */
export const KEY_INVALIDATED =
  "Your phone's fingerprint or face settings changed, so this phone must be paired again. Ask your manager.";

/** R2.7, R5.4: no strong fingerprint or face enrolled. */
export const NO_STRONG_BIOMETRIC_ENROLLED =
  'Turn on fingerprint or face unlock in Settings → Security, then try again.';

/** R2.7, R5.4: no strong (class 3) fingerprint or face hardware at all, so nothing can be enrolled. */
export const NO_STRONG_BIOMETRIC_HARDWARE =
  'This phone has no strong fingerprint or face unlock, so it cannot be paired.';

/** R5.4: no hardware-backed key store. */
export const NO_SECURE_HARDWARE =
  'This phone has no secure hardware for the Attendance app, so it cannot be paired.';

/** R2.14 "no network" while pairing: the code stays valid and the screen offers Retry. */
export const PAIRING_NO_NETWORK =
  'Could not reach the server. Check your network and tap Retry; your code is still valid.';

/** R6.3: the punch was queued because the server was not reachable. */
export const SAVED_OFFLINE = 'Saved on your phone. It will be sent when you have network.';

/** R3.8: worker-initiated unpair needs the server. */
export const UNPAIR_NEEDS_NETWORK =
  'This phone could not be removed because the server could not be reached. Try again when you have network.';

/** R2.10: shown by the old phone after it was replaced. */
export const PHONE_REPLACED = 'This phone is no longer paired';

/** R1.4: the server refused because the shop switch is off (first sentence, as the app's own text). */
export const SHOP_SWITCH_OFF = 'Your shop has not turned on the Attendance app';

/** R4.10: the history screen when there are no punches in the last 31 days (wording not fixed by the spec). */
export const NO_PUNCHES_IN_HISTORY = 'No punches in the last 31 days';

/** R6.16: "2 punches waiting to be sent"; nothing is shown when the count is 0. */
export function waitingToSendLine(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count} ${count === 1 ? 'punch' : 'punches'} waiting to be sent`;
}
