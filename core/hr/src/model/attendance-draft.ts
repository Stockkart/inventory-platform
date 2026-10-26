import type {
  AttendanceRowResponse,
  DayStatus,
  SaveAttendanceDayRow,
  SaveAttendanceStatus,
} from './attendance.types';
import { MAX_ATTENDANCE_NOTE_LENGTH, MAX_ATTENDANCE_ROWS } from './attendance.types';

/**
 * Editable copy of one daily-register row. `status` is what the screen shows; it starts as the
 * resolved status and becomes a save status once the user picks one.
 */
export interface AttendanceDraft {
  status: DayStatus;
  inTime: string;
  outTime: string;
  note: string;
}

/** Statuses the daily screen's segmented control can set directly (Leave goes through leave). */
export const DAILY_MARK_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY'] as const;
export type DailyMarkStatus = (typeof DAILY_MARK_STATUSES)[number];

/**
 * The status the day's own mark controls. On half-day leave the mark is the other half of the
 * day, so the control edits `otherHalf` rather than the overall LEAVE.
 */
export function markedStatus(row: AttendanceRowResponse): DayStatus {
  return row.halfDayLeave ? row.otherHalf ?? 'UNMARKED' : row.status;
}

/** Full-day leave: the server rejects marks (HR_DAY_HAS_LEAVE), so the row is read-only. */
export function isFullDayLeave(row: AttendanceRowResponse): boolean {
  return row.status === 'LEAVE' && !row.halfDayLeave;
}

export function draftFromRow(row: AttendanceRowResponse): AttendanceDraft {
  return {
    status: markedStatus(row),
    inTime: row.inTime ?? '',
    outTime: row.outTime ?? '',
    note: row.note ?? '',
  };
}

/** Times only make sense for a day the employee came in. */
export function takesTimes(status: DayStatus): boolean {
  return status === 'PRESENT' || status === 'HALF_DAY';
}

/** A note is kept with a stored mark, so it needs a status that is saved as a mark. */
export function takesNote(status: DayStatus): boolean {
  return toSaveStatus(status) !== null && status !== 'UNMARKED';
}

/** Draft status → `PUT /attendance/days` status; null = cannot be sent (Leave, Not employed). */
export function toSaveStatus(status: DayStatus): SaveAttendanceStatus | null {
  switch (status) {
    case 'PRESENT':
    case 'ABSENT':
    case 'HALF_DAY':
    case 'WEEK_OFF':
    case 'HOLIDAY':
    case 'UNMARKED':
      return status;
    default:
      return null;
  }
}

export function draftChanged(row: AttendanceRowResponse, draft: AttendanceDraft): boolean {
  const original = draftFromRow(row);
  return (
    original.status !== draft.status ||
    original.inTime !== draft.inTime ||
    original.outTime !== draft.outTime ||
    original.note.trim() !== draft.note.trim()
  );
}

/**
 * Rows to send for a save: only changed, editable rows (full-day leave and Leave/Not-employed
 * drafts are never sent). Times are dropped for statuses that do not take them so a stale
 * in-time from "Present" does not stick to "Absent".
 */
export function buildSaveRows(
  date: string,
  rows: readonly AttendanceRowResponse[],
  drafts: Readonly<Record<string, AttendanceDraft>>,
): SaveAttendanceDayRow[] {
  const out: SaveAttendanceDayRow[] = [];
  for (const row of rows) {
    const draft = drafts[row.employeeId];
    if (!draft || isFullDayLeave(row) || !draftChanged(row, draft)) continue;
    const status = toSaveStatus(draft.status);
    if (status === null) continue;
    const times = takesTimes(draft.status);
    const note = takesNote(draft.status) ? draft.note.trim() : '';
    out.push({
      employeeId: row.employeeId,
      date,
      status,
      inTime: times && draft.inTime ? draft.inTime : null,
      outTime: times && draft.outTime ? draft.outTime : null,
      note: note || null,
    });
  }
  return out;
}

/** Splits rows into calls of at most `size` (server cap 500). */
export function chunkRows<T>(rows: readonly T[], size = MAX_ATTENDANCE_ROWS): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

/** Client copy of `AttendanceDayValidator` checks, so the user sees a reason before saving. */
export function validateDraft(draft: AttendanceDraft): string | null {
  if (takesTimes(draft.status) && draft.inTime && draft.outTime && draft.outTime <= draft.inTime) {
    return 'Out-time must be after in-time on the same day';
  }
  if (draft.note.trim().length > MAX_ATTENDANCE_NOTE_LENGTH) {
    return `A note may have at most ${MAX_ATTENDANCE_NOTE_LENGTH} characters`;
  }
  return null;
}
