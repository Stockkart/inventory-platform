/**
 * The one Indian-mobile rule, twin of Java `com.inventory.common.util.PhoneNumbers` (worker-app
 * R1.2, R4.3, Property 1). Used by the Stockkart Team app before it sends a sign-up or profile edit, so the
 * phone shows the same refusal the server would.
 *
 * Rule: drop every character that is not an ASCII digit `0-9`; accept iff exactly 10 digits
 * remain, or 12 starting with `91` (the country code is then dropped); answer the 10 digits, else
 * `null`. Devanagari or fullwidth digits are not ASCII digits and are dropped like formatting.
 *
 * `fixtures/phones.json` is generated from the Java class by `PhoneNumbersFixtureGeneratorTest`;
 * `phone.test.ts` asserts this function gives the same answer on every row.
 */

/** Length of an Indian mobile number without the country code (`PhoneNumbers.LOCAL_DIGITS`). */
export const PHONE_LOCAL_DIGITS = 10;

/** India's country code as it appears in a dialled number (`PhoneNumbers.COUNTRY_CODE`). */
export const PHONE_COUNTRY_CODE = '91';

/** Keeps the ASCII digits `0-9` of `s`, in order; nothing else. */
function digitsOf(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    // '0' = 48, '9' = 57
    if (c >= 48 && c <= 57) {
      out += s[i];
    }
  }
  return out;
}

/**
 * Normalises a phone number as typed to the 10-digit form, or `null` when the input is not an
 * Indian mobile under the rule above. `null` and `undefined` are treated as empty.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }
  const digits = digitsOf(raw);
  if (digits.length === PHONE_LOCAL_DIGITS) {
    return digits;
  }
  if (
    digits.length === PHONE_LOCAL_DIGITS + PHONE_COUNTRY_CODE.length &&
    digits.startsWith(PHONE_COUNTRY_CODE)
  ) {
    return digits.slice(PHONE_COUNTRY_CODE.length);
  }
  return null;
}

/** True when {@link normalisePhone} accepts `raw` (`PhoneNumbers.isValid`). */
export function isValidPhone(raw: string | null | undefined): boolean {
  return normalisePhone(raw) !== null;
}
