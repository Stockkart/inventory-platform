// HR-module task 10.6 — Property 19: Register filters are conjunctive and sound (R8.10, R8.11).
// The model under test is `register-filters.ts`; the oracles below are written out from the
// requirement text, not from the implementation: a day matches the Source filter when it carries
// one of the chosen sources, matches Flagged when it shows one of the five chips, and the two
// combine as AND. Rows are arbitrary register days, including statuses, sources and flags this
// build does not know, which must render as "unknown" and never throw (task 10.1).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  NO_REGISTER_FILTERS,
  REGISTER_SOURCES,
  daySourceIcon,
  daySources,
  hasRegisterFilters,
  isFlaggedDay,
  matchesRegisterFilters,
  type RegisterDay,
  type RegisterFilters,
  type RegisterSource,
} from './register-filters';

// ---- Generators -------------------------------------------------------------------------------

const KNOWN_STATUSES = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'LEAVE',
  'WEEK_OFF',
  'HOLIDAY',
  'UNMARKED',
  'NOT_EMPLOYED',
] as const;
const KNOWN_MARK_SOURCES = ['MANUAL', 'BULK_PRESENT', 'SELF_CHECK_IN', 'BIOMETRIC_APP'] as const;
const KNOWN_PUNCH_SOURCES = ['SELF', 'BIOMETRIC_APP', 'DEVICE_FILE'] as const;
/** The flags that have a chip (R8.3); `LOCKED_PERIOD` is a known flag with no chip. */
const CHIP_FLAGS = [
  'OUTSIDE_SHOP',
  'LOW_ACCURACY',
  'NO_LOCATION',
  'FAKE_LOCATION',
  'RECORDED_OFFLINE',
] as const;

/** An upper-case word the server might send in a later release. */
const unknownWord = fc
  .stringMatching(/^[A-Z][A-Z_]{2,15}$/)
  .filter(
    (w) =>
      !(KNOWN_STATUSES as readonly string[]).includes(w) &&
      !(KNOWN_MARK_SOURCES as readonly string[]).includes(w) &&
      !(KNOWN_PUNCH_SOURCES as readonly string[]).includes(w) &&
      !(CHIP_FLAGS as readonly string[]).includes(w) &&
      w !== 'LOCKED_PERIOD',
  );
/** Awkward strings: prototype names and the empty string must not be read as flags or sources. */
const awkwardWord = fc.constantFrom('', 'constructor', '__proto__', 'toString', 'hasOwnProperty');

const status = fc.oneof(
  { weight: 6, arbitrary: fc.constantFrom(...KNOWN_STATUSES) },
  { weight: 1, arbitrary: unknownWord },
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant(undefined) },
);
const markSource = fc.oneof(
  { weight: 5, arbitrary: fc.constantFrom(...KNOWN_MARK_SOURCES) },
  { weight: 1, arbitrary: unknownWord },
  { weight: 1, arbitrary: awkwardWord },
  { weight: 3, arbitrary: fc.constant(null) },
  { weight: 2, arbitrary: fc.constant(undefined) },
);
const punchSource = fc.oneof(
  { weight: 5, arbitrary: fc.constantFrom(...KNOWN_PUNCH_SOURCES) },
  { weight: 1, arbitrary: unknownWord },
  { weight: 1, arbitrary: awkwardWord },
  { weight: 3, arbitrary: fc.constant(null) },
  { weight: 2, arbitrary: fc.constant(undefined) },
);
const flag = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom(...CHIP_FLAGS) },
  { weight: 1, arbitrary: fc.constant('LOCKED_PERIOD') },
  { weight: 2, arbitrary: unknownWord },
  { weight: 1, arbitrary: awkwardWord },
);
const flags = fc.oneof(
  { weight: 5, arbitrary: fc.array(flag, { maxLength: 6 }) },
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant(undefined) },
);
const missingCheckOut = fc.oneof(fc.boolean(), fc.constant(null), fc.constant(undefined));

/**
 * A register day as the server might send it: every field optional, and the words possibly from
 * a later release. The server's `PunchFlag[]` type is narrower than what we feed in on purpose.
 */
const registerDay: fc.Arbitrary<RegisterDay> = fc
  .record({ status, markSource, punchSource, flags, missingCheckOut }, { requiredKeys: [] })
  .map((d) => d as unknown as RegisterDay);

const sourceSet = fc.uniqueArray(fc.constantFrom(...REGISTER_SOURCES), {
  maxLength: REGISTER_SOURCES.length,
});
const registerFilters: fc.Arbitrary<RegisterFilters> = fc.record({
  sources: sourceSet,
  flaggedOnly: fc.boolean(),
});
const rows = fc.array(registerDay, { maxLength: 12 });

// ---- Oracles written out from the requirement text -------------------------------------------

/** R8.2: a hand-made mark is MANUAL / BULK_PRESENT, or a stored mark status with no source word. */
function oracleHasHandMark(day: RegisterDay): boolean {
  if (day.markSource != null) {
    return day.markSource === 'MANUAL' || day.markSource === 'BULK_PRESENT';
  }
  return day.status === 'PRESENT' || day.status === 'ABSENT' || day.status === 'HALF_DAY';
}

function oracleSourceOfPunch(s: string | null | undefined): RegisterSource | null {
  if (s === 'SELF') return 'PHONE';
  if (s === 'BIOMETRIC_APP') return 'APP';
  return null;
}

function oracleSourceOfMark(s: string | null | undefined): RegisterSource | null {
  if (s === 'MANUAL' || s === 'BULK_PRESENT') return 'HAND';
  if (s === 'SELF_CHECK_IN') return 'PHONE';
  if (s === 'BIOMETRIC_APP') return 'APP';
  return null;
}

/** R8.10: the sources a day carries — its hand mark, its counted punch, its derived mark. */
function oracleDaySources(day: RegisterDay): Set<RegisterSource> {
  const out = new Set<RegisterSource>();
  if (oracleHasHandMark(day)) out.add('HAND');
  const p = oracleSourceOfPunch(day.punchSource);
  if (p) out.add(p);
  const m = oracleSourceOfMark(day.markSource);
  if (m) out.add(m);
  return out;
}

/** R8.11: the day shows one of the five chips of R8.3. */
function oracleIsFlagged(day: RegisterDay): boolean {
  if (day.missingCheckOut === true) return true;
  const fs = (day.flags ?? []) as readonly string[];
  return fs.some((f) => (CHIP_FLAGS as readonly string[]).includes(f));
}

/** R8.10 ∧ R8.11: (sources empty ∨ daySources ∩ sources ≠ ∅) ∧ (¬flaggedOnly ∨ flagged). */
function oracleMatches(day: RegisterDay, filters: RegisterFilters): boolean {
  const sourceOk =
    filters.sources.length === 0 || filters.sources.some((s) => oracleDaySources(day).has(s));
  const flaggedOk = !filters.flaggedOnly || oracleIsFlagged(day);
  return sourceOk && flaggedOk;
}

const matched = (list: readonly RegisterDay[], filters: RegisterFilters) =>
  list.filter((d) => matchesRegisterFilters(d, filters));

// ---- The property --------------------------------------------------------------------------

describe('Feature: HR-module, Property 19: Register filters are conjunctive and sound', () => {
  const params = { numRuns: 300 };

  it('matches exactly when the day carries a chosen source AND shows a chip when Flagged is on (R8.10, R8.11)', () => {
    fc.assert(
      fc.property(registerDay, registerFilters, (day, filters) => {
        expect(matchesRegisterFilters(day, filters)).toBe(oracleMatches(day, filters));
        // The two building blocks agree with the requirement text on their own as well.
        expect(new Set(daySources(day))).toEqual(oracleDaySources(day));
        expect(isFlaggedDay(day)).toBe(oracleIsFlagged(day));
      }),
      params,
    );
  });

  it('is sound and complete over a list: every output row matches, every matching row is output, order kept', () => {
    fc.assert(
      fc.property(rows, registerFilters, (list, filters) => {
        const out = matched(list, filters);
        for (const d of out) expect(oracleMatches(d, filters)).toBe(true);
        const expected = list.filter((d) => oracleMatches(d, filters));
        expect(out).toEqual(expected);
      }),
      params,
    );
  });

  it('with no filter active the output equals the input (R8.11)', () => {
    fc.assert(
      fc.property(rows, (list) => {
        expect(hasRegisterFilters(NO_REGISTER_FILTERS)).toBe(false);
        expect(matched(list, NO_REGISTER_FILTERS)).toEqual(list);
        expect(matched(list, { sources: [], flaggedOnly: false })).toEqual(list);
      }),
      params,
    );
  });

  it('adding a filter never grows the matched set (monotone), and widening Source never shrinks it', () => {
    fc.assert(
      fc.property(rows, registerFilters, fc.constantFrom(...REGISTER_SOURCES), (list, f, s) => {
        const base = new Set(matched(list, f));
        // Turning Flagged on only removes rows.
        const withFlagged = matched(list, { ...f, flaggedOnly: true });
        for (const d of withFlagged) expect(base.has(d)).toBe(true);
        // Narrowing an active Source filter to one of its members only removes rows.
        if (f.sources.length > 0) {
          const narrowed = matched(list, { ...f, sources: [f.sources[0]] });
          for (const d of narrowed) expect(base.has(d)).toBe(true);
        }
        // Adding a source to an already active Source filter only adds rows.
        if (f.sources.length > 0 && !f.sources.includes(s)) {
          const widened = new Set(matched(list, { ...f, sources: [...f.sources, s] }));
          for (const d of base) expect(widened.has(d)).toBe(true);
        }
        // `hasRegisterFilters` is true exactly when the filters can drop a row.
        expect(hasRegisterFilters(f)).toBe(f.sources.length > 0 || f.flaggedOnly);
      }),
      params,
    );
  });

  it('the icon is the hand whenever a hand mark exists, else the earliest counted punch’s source (R8.1, R8.2)', () => {
    fc.assert(
      fc.property(registerDay, (day) => {
        const icon = daySourceIcon(day);
        if (oracleHasHandMark(day)) {
          expect(icon).toBe('HAND');
        } else {
          const fromPunch = oracleSourceOfPunch(day.punchSource);
          if (fromPunch) expect(icon).toBe(fromPunch);
          else expect(icon).toBe(oracleSourceOfMark(day.markSource));
        }
        // The icon, when shown, is one of the sources the day carries; no icon ⇔ no source.
        const sources = daySources(day);
        if (icon) expect(sources).toContain(icon);
        else expect(sources).toEqual([]);
      }),
      params,
    );
  });

  it('unknown or awkward flags and sources never throw and never count as flagged or as a source', () => {
    const strangeFlag = fc.oneof(unknownWord, awkwardWord, fc.constant('LOCKED_PERIOD'));
    const strangeDay = fc
      .record({
        status,
        markSource: fc.oneof(unknownWord, awkwardWord, fc.constant(null)),
        punchSource: fc.oneof(unknownWord, awkwardWord, fc.constant(null)),
        flags: fc.array(strangeFlag, { maxLength: 5 }),
        missingCheckOut: fc.constantFrom(false, null, undefined),
      })
      .map((d) => d as unknown as RegisterDay);
    fc.assert(
      fc.property(strangeDay, registerFilters, (day, filters) => {
        expect(() => matchesRegisterFilters(day, filters)).not.toThrow();
        expect(isFlaggedDay(day)).toBe(false);
        // Only a stored mark status without a source word can make this day carry a source.
        const handByStatus =
          day.markSource == null && oracleHasHandMark(day) ? (['HAND'] as RegisterSource[]) : [];
        expect(daySources(day)).toEqual(handByStatus);
        expect(daySourceIcon(day)).toBe(handByStatus[0] ?? null);
        expect(matchesRegisterFilters(day, { sources: [], flaggedOnly: true })).toBe(false);
        expect(matchesRegisterFilters(day, { sources: ['PHONE', 'APP'], flaggedOnly: false })).toBe(
          false,
        );
      }),
      params,
    );
  });
});
