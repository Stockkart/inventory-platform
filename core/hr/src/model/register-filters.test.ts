// HR-module task 10.5: the registers' source icon and the "Source" / "Flagged" filters
// (R8.1–R8.2, R8.10–R8.11). Example tests; the fast-check property is task 10.6.
import { describe, expect, it } from 'vitest';
import {
  NO_REGISTER_FILTERS,
  daySourceIcon,
  daySources,
  hasRegisterFilters,
  isFlaggedDay,
  matchesRegisterFilters,
  sourceOfMark,
  sourceOfPunch,
  type RegisterDay,
} from './register-filters';

const HAND_DAY: RegisterDay = { status: 'PRESENT', markSource: 'MANUAL' };
const BULK_DAY: RegisterDay = { status: 'PRESENT', markSource: 'BULK_PRESENT' };
const PHONE_DAY: RegisterDay = {
  status: 'PRESENT',
  markSource: 'SELF_CHECK_IN',
  punchSource: 'SELF',
};
const APP_DAY: RegisterDay = {
  status: 'PRESENT',
  markSource: 'BIOMETRIC_APP',
  punchSource: 'BIOMETRIC_APP',
  flags: ['RECORDED_OFFLINE'],
};
const EMPTY_DAY: RegisterDay = { status: 'UNMARKED' };

describe('source icon (R8.1–R8.2)', () => {
  it('maps mark and punch sources to one icon each', () => {
    expect(sourceOfMark('MANUAL')).toBe('HAND');
    expect(sourceOfMark('BULK_PRESENT')).toBe('HAND');
    expect(sourceOfMark('SELF_CHECK_IN')).toBe('PHONE');
    expect(sourceOfMark('BIOMETRIC_APP')).toBe('APP');
    expect(sourceOfMark('SOMETHING_NEW')).toBeNull();
    expect(sourceOfPunch('SELF')).toBe('PHONE');
    expect(sourceOfPunch('BIOMETRIC_APP')).toBe('APP');
    expect(sourceOfPunch('DEVICE_FILE')).toBeNull();
    expect(sourceOfPunch(null)).toBeNull();
  });

  it('shows hand, phone or fingerprint for the three sources and nothing for an empty day', () => {
    expect(daySourceIcon(HAND_DAY)).toBe('HAND');
    expect(daySourceIcon(BULK_DAY)).toBe('HAND');
    expect(daySourceIcon(PHONE_DAY)).toBe('PHONE');
    expect(daySourceIcon(APP_DAY)).toBe('APP');
    expect(daySourceIcon(EMPTY_DAY)).toBeNull();
    expect(daySourceIcon({ status: 'WEEK_OFF' })).toBeNull();
    expect(daySourceIcon({ status: 'LEAVE' })).toBeNull();
  });

  it('a hand-made mark wins over the day’s punches', () => {
    expect(
      daySourceIcon({ status: 'PRESENT', markSource: 'MANUAL', punchSource: 'BIOMETRIC_APP' }),
    ).toBe('HAND');
  });

  it('with punches from two sources the icon is the earliest counted punch’s', () => {
    // The server sends the earliest counted punch as `punchSource`; the derived mark may say the
    // other source.
    expect(
      daySourceIcon({ status: 'PRESENT', markSource: 'BIOMETRIC_APP', punchSource: 'SELF' }),
    ).toBe('PHONE');
    expect(
      daySourceIcon({
        status: 'PRESENT',
        markSource: 'SELF_CHECK_IN',
        punchSource: 'BIOMETRIC_APP',
      }),
    ).toBe('APP');
  });

  it('reads a month cell with a stored status and no source word as a hand mark', () => {
    // The month register leaves MANUAL out of the cell (backend keeps cells small).
    expect(daySourceIcon({ status: 'PRESENT' })).toBe('HAND');
    expect(daySourceIcon({ status: 'ABSENT' })).toBe('HAND');
    expect(daySourceIcon({ status: 'HALF_DAY' })).toBe('HAND');
    expect(daySourceIcon({ status: 'PRESENT', markSource: 'SELF_CHECK_IN' })).toBe('PHONE');
  });

  it('lists every source a day carries, without repeats', () => {
    expect(daySources({ status: 'PRESENT', markSource: 'MANUAL', punchSource: 'SELF' })).toEqual([
      'HAND',
      'PHONE',
    ]);
    expect(daySources(APP_DAY)).toEqual(['APP']);
    expect(daySources(EMPTY_DAY)).toEqual([]);
  });
});

describe('flagged days (R8.11)', () => {
  it('is flagged when any of the five chips shows, and not otherwise', () => {
    expect(isFlaggedDay({ flags: ['OUTSIDE_SHOP'] })).toBe(true);
    expect(isFlaggedDay({ flags: ['FAKE_LOCATION'] })).toBe(true);
    expect(isFlaggedDay({ flags: ['RECORDED_OFFLINE'] })).toBe(true);
    expect(isFlaggedDay({ missingCheckOut: true })).toBe(true);
    expect(isFlaggedDay({ flags: ['LOCKED_PERIOD'] })).toBe(false);
    expect(isFlaggedDay({ flags: [] })).toBe(false);
    expect(isFlaggedDay({})).toBe(false);
  });
});

describe('matchesRegisterFilters (R8.10–R8.11)', () => {
  const days = [HAND_DAY, BULK_DAY, PHONE_DAY, APP_DAY, EMPTY_DAY];

  it('lets every day through with no filter active', () => {
    expect(hasRegisterFilters(NO_REGISTER_FILTERS)).toBe(false);
    expect(days.every((d) => matchesRegisterFilters(d, NO_REGISTER_FILTERS))).toBe(true);
  });

  it('"Source" keeps days with a mark or counted punch of any chosen source', () => {
    const hand = { sources: ['HAND'] as const, flaggedOnly: false };
    expect(days.filter((d) => matchesRegisterFilters(d, hand))).toEqual([HAND_DAY, BULK_DAY]);
    const phoneOrApp = { sources: ['PHONE', 'APP'] as const, flaggedOnly: false };
    expect(days.filter((d) => matchesRegisterFilters(d, phoneOrApp))).toEqual([PHONE_DAY, APP_DAY]);
    // A hand-marked day that also has My HR punches matches both Hand and My HR.
    const both: RegisterDay = { status: 'PRESENT', markSource: 'MANUAL', punchSource: 'SELF' };
    expect(matchesRegisterFilters(both, hand)).toBe(true);
    expect(matchesRegisterFilters(both, { sources: ['PHONE'], flaggedOnly: false })).toBe(true);
    expect(matchesRegisterFilters(both, { sources: ['APP'], flaggedOnly: false })).toBe(false);
    // An empty day never matches a source.
    expect(matchesRegisterFilters(EMPTY_DAY, phoneOrApp)).toBe(false);
  });

  it('"Flagged" keeps only days that show a chip', () => {
    const flagged = { sources: [], flaggedOnly: true };
    expect(hasRegisterFilters(flagged)).toBe(true);
    expect(days.filter((d) => matchesRegisterFilters(d, flagged))).toEqual([APP_DAY]);
  });

  it('"Source" and "Flagged" combine as AND', () => {
    const flaggedPhone = { sources: ['PHONE'] as const, flaggedOnly: true };
    expect(matchesRegisterFilters(APP_DAY, flaggedPhone)).toBe(false); // flagged, wrong source
    expect(matchesRegisterFilters(PHONE_DAY, flaggedPhone)).toBe(false); // right source, no chip
    expect(matchesRegisterFilters({ ...PHONE_DAY, missingCheckOut: true }, flaggedPhone)).toBe(
      true,
    );
    const flaggedApp = { sources: ['APP'] as const, flaggedOnly: true };
    expect(matchesRegisterFilters(APP_DAY, flaggedApp)).toBe(true);
  });
});
