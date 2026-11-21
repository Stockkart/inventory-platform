import { describe, expect, it } from 'vitest';
import type { AttendanceSource, PunchFlag, PunchSource } from './attendance.types';
import {
  ATTENDANCE_SOURCE_LABELS,
  AUDIT_ACTION_LABELS,
  MANUAL_MARK_REASONS,
  MANUAL_MARK_REASON_LABELS,
  PUNCH_FLAG_LABELS,
  PUNCH_SOURCE_LABELS,
  UNKNOWN_LABEL,
  attendanceSourceLabel,
  captureChips,
  manualMarkReasonLabel,
  punchFlagLabel,
  punchSourceLabel,
} from './labels';

const PUNCH_FLAGS: PunchFlag[] = [
  'OUTSIDE_SHOP',
  'LOW_ACCURACY',
  'NO_LOCATION',
  'LOCKED_PERIOD',
  'FAKE_LOCATION',
  'RECORDED_OFFLINE',
];
const PUNCH_SOURCES: PunchSource[] = ['SELF', 'BIOMETRIC_APP', 'DEVICE_FILE', 'BRIDGE'];
const ATTENDANCE_SOURCES: AttendanceSource[] = [
  'MANUAL',
  'BULK_PRESENT',
  'SELF_CHECK_IN',
  'BIOMETRIC_APP',
];

describe('Attendance app labels (R8.1, R8.3, R7.3)', () => {
  it('names the Attendance app source and its two new flags', () => {
    expect(PUNCH_SOURCE_LABELS.BIOMETRIC_APP).toBe('Attendance app');
    expect(ATTENDANCE_SOURCE_LABELS.BIOMETRIC_APP).toBe('Attendance app');
    expect(PUNCH_FLAG_LABELS.FAKE_LOCATION).toBe('Fake location');
    expect(PUNCH_FLAG_LABELS.RECORDED_OFFLINE).toBe('Recorded offline');
  });

  it('uses the three register words: Hand, My HR, Attendance app', () => {
    expect(ATTENDANCE_SOURCE_LABELS.MANUAL).toBe('Hand');
    expect(ATTENDANCE_SOURCE_LABELS.BULK_PRESENT).toBe('Hand');
    expect(ATTENDANCE_SOURCE_LABELS.SELF_CHECK_IN).toBe('My HR');
    expect(PUNCH_SOURCE_LABELS.SELF).toBe('My HR');
  });

  it('labels every known constant with a non-empty word', () => {
    for (const f of PUNCH_FLAGS) expect(punchFlagLabel(f)).toBe(PUNCH_FLAG_LABELS[f]);
    for (const s of PUNCH_SOURCES) expect(punchSourceLabel(s)).toBe(PUNCH_SOURCE_LABELS[s]);
    for (const s of ATTENDANCE_SOURCES) {
      expect(attendanceSourceLabel(s)).toBe(ATTENDANCE_SOURCE_LABELS[s]);
    }
    for (const r of MANUAL_MARK_REASONS) {
      expect(manualMarkReasonLabel(r)).toBe(MANUAL_MARK_REASON_LABELS[r]);
    }
    for (const label of [
      ...Object.values(PUNCH_FLAG_LABELS),
      ...Object.values(PUNCH_SOURCE_LABELS),
      ...Object.values(ATTENDANCE_SOURCE_LABELS),
      ...Object.values(MANUAL_MARK_REASON_LABELS),
    ]) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toBe(UNKNOWN_LABEL);
    }
  });

  it('renders a value this build does not know as "unknown" and never throws', () => {
    for (const odd of ['NEW_FLAG', '', 'self', 'toString', 'constructor', '__proto__']) {
      expect(punchFlagLabel(odd)).toBe('unknown');
      expect(punchSourceLabel(odd)).toBe('unknown');
      expect(attendanceSourceLabel(odd)).toBe('unknown');
      expect(manualMarkReasonLabel(odd)).toBe('unknown');
    }
    expect(punchSourceLabel(null)).toBe('unknown');
    expect(punchSourceLabel(undefined)).toBe('unknown');
    expect(punchFlagLabel(null)).toBe('unknown');
    expect(attendanceSourceLabel(undefined)).toBe('unknown');
    expect(manualMarkReasonLabel(null)).toBe('unknown');
  });

  it('offers the five quick picks in the prompt order', () => {
    expect(MANUAL_MARK_REASONS.map((r) => MANUAL_MARK_REASON_LABELS[r])).toEqual([
      'Forgot phone',
      'Phone not working',
      'No network',
      'Biometric not working',
      'Other',
    ]);
  });

  it('describes the pairing history actions', () => {
    expect(AUDIT_ACTION_LABELS.DEVICE_PAIRED).toBe('Phone paired');
    expect(AUDIT_ACTION_LABELS.DEVICE_REPLACED).toBe('Phone replaced');
    expect(AUDIT_ACTION_LABELS.DEVICE_UNPAIRED).toBe('Phone unpaired');
    expect(AUDIT_ACTION_LABELS.PAIRING_CODE_CREATED).toBe('Pairing code created');
    expect(AUDIT_ACTION_LABELS.DEVICE_CONSENT_UPDATED).toBe('Consent updated');
  });
});

describe('captureChips with the Attendance app flags (R8.3–R8.4)', () => {
  it('adds "Fake location" and "Recorded offline", each at most once', () => {
    expect(
      captureChips({
        flags: ['RECORDED_OFFLINE', 'FAKE_LOCATION', 'RECORDED_OFFLINE', 'FAKE_LOCATION'],
      }),
    ).toEqual(['Recorded offline', 'Fake location']);
  });

  it('can show both new chips with the existing ones', () => {
    expect(
      captureChips({
        missingCheckOut: true,
        flags: ['OUTSIDE_SHOP', 'LOW_ACCURACY', 'NO_LOCATION', 'FAKE_LOCATION', 'RECORDED_OFFLINE'],
      }),
    ).toEqual([
      'Missing check-out',
      'Outside shop',
      'Location unclear',
      'Fake location',
      'Recorded offline',
    ]);
  });

  it('skips the reserved LOCKED_PERIOD flag and any flag it does not know, without throwing', () => {
    const flags = ['LOCKED_PERIOD', 'SOMETHING_NEW', 'FAKE_LOCATION'] as unknown as PunchFlag[];
    expect(captureChips({ flags })).toEqual(['Fake location']);
    expect(captureChips({ flags: ['constructor'] as unknown as PunchFlag[] })).toEqual([]);
  });
});
