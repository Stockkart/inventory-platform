import type {
  AttendanceRowResponse,
  DayStatus,
  ManualMarkReason,
  SaveAttendanceDayRow,
  SaveAttendanceStatus,
} from './attendance.types';
import {
  MAX_ATTENDANCE_NOTE_LENGTH,
  MAX_ATTENDANCE_ROWS,
  MAX_MARK_REASON_TEXT_LENGTH,
} from './attendance.types';

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

/**
 * Client copy of the hand-mark reason rule (R7.3–R7.4): a quick pick is required; "Other" also
 * needs 1–{@link MAX_MARK_REASON_TEXT_LENGTH} characters after trimming, so whitespace-only text
 * counts as empty. Returns the message to show, or null when the reason can be saved.
 */
export function validateMarkReason(
  reason: ManualMarkReason | null,
  reasonText: string,
): string | null {
  if (reason == null) return 'Choose a reason for marking this by hand';
  if (reason !== 'OTHER') return null;
  const text = reasonText.trim();
  if (text.length === 0) return 'Please say why in a few words';
  if (text.length > MAX_MARK_REASON_TEXT_LENGTH) {
    return `A reason may have at most ${MAX_MARK_REASON_TEXT_LENGTH} characters`;
  }
  return null;
}

/** The `reason` / `reasonText` fields to send: the text only travels with "Other". */
export function markReasonFields(
  reason: ManualMarkReason,
  reasonText: string,
): Pick<SaveAttendanceDayRow, 'reason' | 'reasonText'> {
  return { reason, reasonText: reason === 'OTHER' ? reasonText.trim() : null };
}
