/**
 * One-time pairing codes for the Attendance app (R2.3), mirroring the Java
 * `com.inventory.hr.utils.PairingCodes`. A code is 8 characters from an alphabet without `0`,
 * `O`, `1` and `I`; typing is case-insensitive and spaces or hyphens between groups are ignored.
 * The QR code carries the code in a URL fragment so a web page scanning it never receives it.
 */

/** 32 symbols: capital letters and digits without 0, O, 1 and I. 8 characters = 40 bits. */
export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Number of characters in a code. */
export const PAIRING_CODE_LENGTH = 8;

/** Prefix of the QR payload; the code follows after `#`. */
export const PAIRING_QR_PREFIX = 'https://stockkart.in/attendance/pair#';

/**
 * What the worker typed, made comparable: trimmed, upper-cased, with spaces and hyphens removed.
 * Null or undefined becomes the empty string. Does not check validity; see {@link isPairingCode}.
 */
export function normalisePairingCode(typed: string | null | undefined): string {
  if (typed == null) {
    return '';
  }
  return typed.trim().toUpperCase().replace(/[ -]/g, '');
}

/** True when `code` is exactly 8 characters, each from {@link PAIRING_CODE_ALPHABET}. */
export function isPairingCode(code: string | null | undefined): boolean {
  if (typeof code !== 'string' || code.length !== PAIRING_CODE_LENGTH) {
    return false;
  }
  for (const c of code) {
    if (!PAIRING_CODE_ALPHABET.includes(c)) {
      return false;
    }
  }
  return true;
}

/** The text shown as a QR code: `https://stockkart.in/attendance/pair#<CODE>`. */
export function pairingQrPayload(code: string): string {
  return `${PAIRING_QR_PREFIX}${code}`;
}

/**
 * The code carried by a scanned QR payload or typed text: the QR URL
 * (`https://stockkart.in/attendance/pair#<CODE>`) or the bare code, in any case and with spaces or
 * hyphens between groups. Returns the normalised 8-character code, or null when the text holds no
 * valid code; the app then shows the "code wrong" message without a network call.
 */
export function pairingCodeFromScan(text: string | null | undefined): string | null {
  if (text == null) {
    return null;
  }
  const trimmed = text.trim();
  const candidate =
    trimmed.slice(0, PAIRING_QR_PREFIX.length).toLowerCase() === PAIRING_QR_PREFIX
      ? trimmed.slice(PAIRING_QR_PREFIX.length)
      : trimmed;
  const code = normalisePairingCode(candidate);
  return isPairingCode(code) ? code : null;
}
