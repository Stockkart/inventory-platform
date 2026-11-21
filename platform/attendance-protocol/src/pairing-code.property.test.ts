// Task 9.3 — Property 8 (Pairing codes are well formed and typing is forgiving, R2.3), the
// phone-side half: whatever case, spacing and hyphenation a worker types around a valid code
// normalises back to it, anything with a foreign character or the wrong length is refused before
// a network call, and the QR payload round-trips.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_QR_PREFIX,
  isPairingCode,
  normalisePairingCode,
  pairingCodeFromScan,
  pairingQrPayload,
} from './pairing-code.js';

const NUM_RUNS = 100;
const ALPHABET = [...PAIRING_CODE_ALPHABET];

const codeChar = fc.constantFrom(...ALPHABET);
const code = fc
  .array(codeChar, { minLength: PAIRING_CODE_LENGTH, maxLength: PAIRING_CODE_LENGTH })
  .map((a) => a.join(''));

/** Spaces and hyphens a worker may type between (or around) the characters. */
const separator = fc.array(fc.constantFrom(' ', '-'), { maxLength: 3 }).map((a) => a.join(''));
/** Whitespace at the very ends of the text, as a copy-paste or keyboard would leave it. */
const edgeWhitespace = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 3 })
  .map((a) => a.join(''));
const caseFlags = fc.array(fc.boolean(), {
  minLength: PAIRING_CODE_LENGTH,
  maxLength: PAIRING_CODE_LENGTH,
});
const separators = fc.array(separator, {
  minLength: PAIRING_CODE_LENGTH + 1,
  maxLength: PAIRING_CODE_LENGTH + 1,
});

/** `code` as a worker might type it: re-cased, with separators between and around characters. */
function decorate(
  c: string,
  lower: boolean[],
  seps: string[],
  leading: string,
  trailing: string,
): string {
  let out = seps[0];
  for (let i = 0; i < c.length; i++) {
    out += (lower[i] ? c[i].toLowerCase() : c[i]) + seps[i + 1];
  }
  return leading + out + trailing;
}

/** Characters that look like code characters but are not in the alphabet, plus a few others. */
const foreignChar = fc.oneof(
  fc.constantFrom('0', 'O', '1', 'I', '*', '!', '_', '.', 'é', 'ß', '€', '😀'),
  fc
    .string({ unit: 'grapheme', minLength: 1, maxLength: 1 })
    .filter((ch) => !PAIRING_CODE_ALPHABET.includes(ch.toUpperCase()) && !/^[ \t\n\r-]$/.test(ch)),
);

const wrongLength = fc
  .integer({ min: 0, max: 16 })
  .filter((n) => n !== PAIRING_CODE_LENGTH)
  .chain((n) => fc.array(codeChar, { minLength: n, maxLength: n }).map((a) => a.join('')));

describe('Property 8: Pairing codes are well formed and typing is forgiving', () => {
  it('Feature: HR-module, Property 8: Pairing codes are well formed and typing is forgiving — the alphabet has 32 symbols and none of 0, O, 1, I', () => {
    expect(PAIRING_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(ALPHABET).size).toBe(32);
    expect(PAIRING_CODE_ALPHABET).not.toMatch(/[0O1I]/);
    expect(PAIRING_CODE_ALPHABET).toBe(PAIRING_CODE_ALPHABET.toUpperCase());
  });

  it('Feature: HR-module, Property 8: Pairing codes are well formed and typing is forgiving — any re-casing, spaces, hyphens or edge whitespace normalise back to the code', () => {
    fc.assert(
      fc.property(
        code,
        caseFlags,
        separators,
        edgeWhitespace,
        edgeWhitespace,
        (c, lower, seps, leading, trailing) => {
          const typed = decorate(c, lower, seps, leading, trailing);
          expect(normalisePairingCode(typed)).toBe(c);
          expect(isPairingCode(normalisePairingCode(typed))).toBe(true);
          expect(isPairingCode(c)).toBe(true);
          expect(pairingCodeFromScan(typed)).toBe(c);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 8: Pairing codes are well formed and typing is forgiving — one foreign character anywhere makes the code invalid', () => {
    fc.assert(
      fc.property(
        code,
        fc.nat({ max: PAIRING_CODE_LENGTH - 1 }),
        foreignChar,
        caseFlags,
        separators,
        (c, at, bad, lower, seps) => {
          const broken = c.slice(0, at) + bad + c.slice(at + 1);
          expect(isPairingCode(broken)).toBe(false);
          expect(isPairingCode(normalisePairingCode(broken))).toBe(false);
          const typed = decorate(broken, lower, seps, '', '');
          expect(pairingCodeFromScan(typed)).toBeNull();
          expect(pairingCodeFromScan(pairingQrPayload(broken))).toBeNull();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 8: Pairing codes are well formed and typing is forgiving — any length other than 8 is invalid', () => {
    fc.assert(
      fc.property(wrongLength, (s) => {
        expect(isPairingCode(s)).toBe(false);
        expect(pairingCodeFromScan(s)).toBeNull();
        expect(pairingCodeFromScan(pairingQrPayload(s))).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, Property 8: Pairing codes are well formed and typing is forgiving — the QR payload round-trips, whatever the case of the URL', () => {
    fc.assert(
      fc.property(code, caseFlags, separators, fc.boolean(), (c, lower, seps, upperUrl) => {
        const payload = pairingQrPayload(c);
        expect(payload).toBe(`${PAIRING_QR_PREFIX}${c}`);
        expect(payload.startsWith('https://')).toBe(true);
        expect(payload.includes('#')).toBe(true);
        expect(payload.includes('?')).toBe(false);
        expect(pairingCodeFromScan(payload)).toBe(c);

        const prefix = upperUrl ? PAIRING_QR_PREFIX.toUpperCase() : PAIRING_QR_PREFIX;
        const typedInUrl = prefix + decorate(c, lower, seps, '', '');
        expect(pairingCodeFromScan(typedInUrl)).toBe(c);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
