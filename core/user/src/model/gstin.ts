// Offline GSTIN checks, mirroring Gstin.java on the backend, so a typo is caught before any lookup.
const SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const GSTIN_LENGTH = 15;

export function normalizeGstin(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase();
}

/** The mod-36 Luhn check character for the first fourteen characters. */
export function gstinCheckCharacter(first14: string): string {
  let sum = 0;
  for (let i = 0; i < first14.length; i++) {
    const code = ALPHABET.indexOf(first14[i]);
    const product = code * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return ALPHABET[(36 - (sum % 36)) % 36];
}

export function isValidGstin(raw: string | null | undefined): boolean {
  const s = normalizeGstin(raw);
  return SHAPE.test(s) && s[14] === gstinCheckCharacter(s.slice(0, 14));
}

/** Why a GSTIN is rejected, in plain words; null when it is fine. */
export function gstinProblem(raw: string | null | undefined): string | null {
  const s = normalizeGstin(raw);
  if (!s) return 'Enter the 15-character GSTIN';
  if (s.length !== GSTIN_LENGTH) return `A GSTIN has 15 characters; this one has ${s.length}`;
  if (!SHAPE.test(s))
    return 'This does not look like a GSTIN (2 digits, PAN, entity number, Z, check character)';
  if (s[14] !== gstinCheckCharacter(s.slice(0, 14)))
    return 'The check character does not match — one of the characters is mistyped';
  return null;
}

/** The two-digit state code a valid GSTIN was issued under. */
export function gstinStateCode(raw: string | null | undefined): string | null {
  return isValidGstin(raw) ? normalizeGstin(raw).slice(0, 2) : null;
}
