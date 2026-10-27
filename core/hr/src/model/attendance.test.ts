import { describe, expect, it } from 'vitest';
import type { AttendanceRowResponse } from './attendance.types';
import { buildSaveRows, chunkRows, draftFromRow, validateDraft } from './attendance-draft';
import {
  formatDayRange,
  formatDayShort,
  formatDays,
  formatMinutes,
  isBlankFutureCell,
} from './format';
import { leaveYearOf, recentLeaveYears } from './leave-year';

function row(over: Partial<AttendanceRowResponse> = {}): AttendanceRowResponse {
  return {
    employeeId: 'e1',
    code: 'EMP-001',
    name: 'Ravi',
    date: '2026-10-06',
    status: 'UNMARKED',
    source: 'NONE',
    halfDayLeave: false,
    late: false,
    overtimeMinutes: 0,
    autoHalfDay: false,
    locked: false,
    ...over,
  };
}

describe('buildSaveRows', () => {
  const D = '2026-10-06';

  it('sends only changed rows', () => {
    const a = row({ employeeId: 'a' });
    const b = row({ employeeId: 'b', status: 'PRESENT', source: 'MARK', inTime: '09:00' });
    const c = row({ employeeId: 'c' });
    const drafts = {
      a: { ...draftFromRow(a), status: 'PRESENT' as const, inTime: '09:15' },
      b: draftFromRow(b), // untouched copy
    };
    expect(buildSaveRows(D, [a, b, c], drafts)).toEqual([
      { employeeId: 'a', date: D, status: 'PRESENT', inTime: '09:15', outTime: null, note: null },
    ]);
  });

  it('clears with UNMARKED and drops times for statuses without them', () => {
    const a = row({ employeeId: 'a', status: 'PRESENT', source: 'MARK', inTime: '09:00' });
    const b = row({ employeeId: 'b', status: 'PRESENT', source: 'MARK', inTime: '09:00' });
    const out = buildSaveRows(D, [a, b], {
      a: { status: 'UNMARKED', inTime: '', outTime: '', note: '' },
      b: { status: 'ABSENT', inTime: '09:00', outTime: '', note: ' sick ' },
    });
    expect(out).toEqual([
      { employeeId: 'a', date: D, status: 'UNMARKED', inTime: null, outTime: null, note: null },
      { employeeId: 'b', date: D, status: 'ABSENT', inTime: null, outTime: null, note: 'sick' },
    ]);
  });

  it('never sends full-day leave rows or Leave drafts', () => {
    const onLeave = row({ employeeId: 'a', status: 'LEAVE', source: 'LEAVE' });
    const other = row({ employeeId: 'b' });
    expect(
      buildSaveRows(D, [onLeave, other], {
        a: { status: 'PRESENT', inTime: '', outTime: '', note: '' },
        b: { status: 'LEAVE', inTime: '', outTime: '', note: '' },
      }),
    ).toEqual([]);
  });

  it('edits the other half on half-day leave', () => {
    const half = row({
      status: 'LEAVE',
      source: 'LEAVE',
      halfDayLeave: true,
      otherHalf: 'UNMARKED',
    });
    expect(draftFromRow(half).status).toBe('UNMARKED');
    expect(
      buildSaveRows(D, [half], { e1: { status: 'PRESENT', inTime: '', outTime: '', note: '' } }),
    ).toHaveLength(1);
  });

  it('chunks at 500 and validates times and note length', () => {
    expect(chunkRows(Array.from({ length: 1001 }, (_, i) => i)).map((c) => c.length)).toEqual([
      500, 500, 1,
    ]);
    expect(validateDraft({ status: 'PRESENT', inTime: '10:00', outTime: '09:00', note: '' })).toBe(
      'Out-time must be after in-time on the same day',
    );
    expect(validateDraft({ status: 'ABSENT', inTime: '10:00', outTime: '09:00', note: '' })).toBe(
      null,
    );
    expect(
      validateDraft({ status: 'ABSENT', inTime: '', outTime: '', note: 'x'.repeat(201) }),
    ).toMatch(/200/);
  });
});

describe('formatting', () => {
  it('shows days like "Mon, 6 Oct"', () => {
    expect(formatDayShort('2026-10-06')).toBe('Tue, 6 Oct');
    expect(formatDayShort('2025-10-06')).toBe('Mon, 6 Oct');
    expect(formatDayRange('2025-10-06', '2025-10-08')).toBe('Mon, 6 Oct – Wed, 8 Oct');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(1.5)).toBe('1.5 days');
    expect(formatDays(null)).toBe('No limit');
    expect(formatMinutes(510)).toBe('8 h 30 min');
  });
});

describe('leave years', () => {
  it('matches the backend names', () => {
    expect(leaveYearOf('2026-03-31', 'APRIL')).toBe('2025-26');
    expect(leaveYearOf('2026-04-01', 'APRIL')).toBe('2026-27');
    expect(leaveYearOf('2026-03-31', 'JANUARY')).toBe('2026');
    expect(recentLeaveYears('2026-05-01', 'APRIL')).toEqual(['2026-27', '2025-26', '2024-25']);
    expect(recentLeaveYears('2026-05-01', null, 2)).toEqual(['2026', '2025']);
  });
});

describe('isBlankFutureCell (run F8)', () => {
  it('is true only for a server-flagged future Unmarked day', () => {
    expect(isBlankFutureCell({ status: 'UNMARKED', future: true })).toBe(true);
    expect(isBlankFutureCell({ status: 'HOLIDAY', future: true })).toBe(false);
    expect(isBlankFutureCell({ status: 'LEAVE', future: true })).toBe(false);
    expect(isBlankFutureCell({ status: 'UNMARKED' })).toBe(false);
    expect(isBlankFutureCell({ status: 'UNMARKED', future: null })).toBe(false);
  });
});
