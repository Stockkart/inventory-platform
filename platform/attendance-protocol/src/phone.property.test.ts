// Task 9.2 — Property 1 (Name and phone rules are the same everywhere, R1.2, R1.4), the
// TypeScript half of the phone rule: `normalisePhone` accepts a string iff its ASCII digits are
// exactly 10, or `91` followed by 10, and then answers those 10 digits; everything that is not an
// ASCII digit is formatting and never changes the answer; and the rule agrees with the Java
// `PhoneNumbers.normalise` on every row of the shared fixture. The Java half is
// `core/common/.../PhoneNumbersProperties` (task 1.3). The name half of the property
// (2–100 characters after trim) has no function in this package; on the TypeScript side it lives
// in `apps/attendance/src/account/validation.ts`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PHONE_COUNTRY_CODE, PHONE_LOCAL_DIGITS, isValidPhone, normalisePhone } from './phone.js';

const NUM_RUNS = 100;

/** `fixtures/phones.json`, written by the Java `PhoneNumbersFixtureGeneratorTest` (task 1.2). */
interface PhonesFixture {
  cases: { name: string; input: string; normalised: string | null }[];
}

const fixture: PhonesFixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/phones.json', import.meta.url)), 'utf8'),
);

const ASCII_DIGITS = [...'0123456789'];

/**
 * The rule as the design states it, written independently of `phone.ts`: keep the ASCII digits;
 * 10 of them are the answer, 12 starting with `91` lose the `91`, anything else is refused.
 */
function oracle(s: string): string | null {
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return null;
}

const digitRun = (n: number) =>
  fc.array(fc.constantFrom(...ASCII_DIGITS), { minLength: n, maxLength: n }).map((a) => a.join(''));

const tenDigits = digitRun(10);

/**
 * Characters that are not ASCII digits: the punctuation a worker types around a number, spaces,
 * letters, and digits of other scripts (Devanagari, fullwidth, Arabic-Indic), which the rule
 * treats as formatting too.
 */
const formattingChar = fc.oneof(
  fc.constantFrom(
    ' ',
    '-',
    '+',
    '(',
    ')',
    '.',
    '/',
    '\t',
    '\n',
    'x',
    'A',
    '९',
    '०',
    '０',
    '٣',
    '😀',
  ),
  fc.string({ unit: 'grapheme', minLength: 1, maxLength: 1 }).filter((ch) => !/[0-9]/.test(ch)),
);
const formatting = fc.array(formattingChar, { maxLength: 3 }).map((a) => a.join(''));

/** How the country code shows up in a dialled or pasted number. */
const countryCodePrefix = fc.constantFrom(
  '',
  PHONE_COUNTRY_CODE,
  `+${PHONE_COUNTRY_CODE}`,
  `+${PHONE_COUNTRY_CODE} `,
  `(${PHONE_COUNTRY_CODE}) `,
  `${PHONE_COUNTRY_CODE}-`,
);

/** `digits` with formatting between and around the characters. */
function decorate(digits: string, seps: string[]): string {
  let out = seps[0];
  for (let i = 0; i < digits.length; i++) {
    out += digits[i] + seps[i + 1];
  }
  return out;
}

const separatorsFor = (n: number) => fc.array(formatting, { minLength: n + 1, maxLength: n + 1 });

/** Any text, ASCII or full Unicode, as a text field or a paste may deliver it. */
const anyText = fc.oneof(
  fc.string(),
  fc.string({ unit: 'grapheme' }),
  fc.string({ unit: fc.constantFrom(...ASCII_DIGITS, ' ', '-', '+', '९'), maxLength: 14 }),
);

/** A digit count the rule refuses outright: anything but 10 or 12. */
const refusedLength = fc.integer({ min: 0, max: 20 }).filter((n) => n !== 10 && n !== 12);

/** Twelve digits that do not start with the country code. */
const twelveWithoutCountryCode = digitRun(12).filter((d) => !d.startsWith(PHONE_COUNTRY_CODE));

describe('Property 1: Name and phone rules are the same everywhere (phone, TypeScript half)', () => {
  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — the constants are the rule the fixture states', () => {
    expect(PHONE_LOCAL_DIGITS).toBe(10);
    expect(PHONE_COUNTRY_CODE).toBe('91');
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — normalisePhone and the stated rule give the Java answer on every fixture row', () => {
    expect(fixture.cases.length).toBeGreaterThan(20);
    const disagreements = fixture.cases
      .map(({ name, input, normalised }) => ({
        name,
        input,
        java: normalised,
        typescript: normalisePhone(input),
        rule: oracle(input),
      }))
      .filter((row) => row.typescript !== row.java || row.rule !== row.java);
    expect(disagreements).toEqual([]);
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — for any text, normalisePhone is the stated rule and isValidPhone is its acceptance', () => {
    fc.assert(
      fc.property(anyText, (s) => {
        const want = oracle(s);
        expect(normalisePhone(s)).toBe(want);
        expect(isValidPhone(s)).toBe(want !== null);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — any 10 digits, however formatted, with or without the country code, normalise to those 10 digits', () => {
    fc.assert(
      fc.property(tenDigits, countryCodePrefix, separatorsFor(10), (digits, prefix, seps) => {
        const typed = prefix + decorate(digits, seps);
        expect(normalisePhone(typed)).toBe(digits);
        expect(isValidPhone(typed)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — a digit count other than 10, or 12 without the country code, is refused however it is formatted', () => {
    fc.assert(
      fc.property(
        fc.oneof(refusedLength.chain(digitRun), twelveWithoutCountryCode),
        formatting,
        formatting,
        (digits, leading, trailing) => {
          const typed = leading + digits + trailing;
          expect(normalisePhone(typed)).toBeNull();
          expect(isValidPhone(typed)).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — inserting a non-digit anywhere never changes the answer', () => {
    fc.assert(
      fc.property(anyText, fc.nat(), formattingChar, (s, at, ch) => {
        const pos = s.length === 0 ? 0 : at % (s.length + 1);
        const withNoise = s.slice(0, pos) + ch + s.slice(pos);
        expect(normalisePhone(withNoise)).toBe(normalisePhone(s));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: worker-app, Property 1: Name and phone rules are the same everywhere — an accepted answer is 10 ASCII digits and a fixed point, also behind the country code', () => {
    fc.assert(
      fc.property(tenDigits, countryCodePrefix, separatorsFor(10), (digits, prefix, seps) => {
        const answer = normalisePhone(prefix + decorate(digits, seps));
        expect(answer).not.toBeNull();
        expect(answer).toMatch(/^[0-9]{10}$/);
        expect(normalisePhone(answer)).toBe(answer);
        expect(normalisePhone(`+${PHONE_COUNTRY_CODE}${answer}`)).toBe(answer);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
