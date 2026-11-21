import { cn } from '../utils/cn';
import styles from './AttendanceCell.module.css';

/** Resolved day status, same names as the backend `DayStatus`. */
export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'LEAVE'
  | 'WEEK_OFF'
  | 'HOLIDAY'
  | 'UNMARKED';

/** Short mark and full word for each status; also usable for a legend. */
export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { letter: string; word: string }> = {
  PRESENT: { letter: 'P', word: 'Present' },
  ABSENT: { letter: 'A', word: 'Absent' },
  HALF_DAY: { letter: 'H', word: 'Half-day' },
  LEAVE: { letter: 'L', word: 'Leave' },
  WEEK_OFF: { letter: 'W', word: 'Week-off' },
  HOLIDAY: { letter: 'Ho', word: 'Holiday' },
  UNMARKED: { letter: '–', word: 'Unmarked' },
};

const STATUS_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: styles.present,
  ABSENT: styles.absent,
  HALF_DAY: styles.halfDay,
  LEAVE: styles.leave,
  WEEK_OFF: styles.weekOff,
  HOLIDAY: styles.holiday,
  UNMARKED: styles.unmarked,
};

export interface AttendanceCellProps {
  status: AttendanceStatus;
  /** Came in late; shows a small dot and adds ", late" to the spoken label. */
  late?: boolean;
  /** Prefix for the spoken label, e.g. "Asha, 12 October" → "Asha, 12 October: Present, late". */
  context?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * One attendance mark: a short letter on a status colour, with a dot when the person was late.
 * Colour is never the only signal — the letter is visible and screen readers hear the full word.
 */
export function AttendanceCell({
  status,
  late = false,
  context,
  size = 'md',
  className,
}: AttendanceCellProps) {
  const meta = ATTENDANCE_STATUS_META[status];
  const spoken = `${context ? `${context}: ` : ''}${meta.word}${late ? ', late' : ''}`;
  return (
    <span
      role="img"
      aria-label={spoken}
      title={spoken}
      className={cn(styles.cell, styles[size], STATUS_CLASS[status], className)}
    >
      <span aria-hidden="true">{meta.letter}</span>
      {late ? <span className={styles.lateDot} aria-hidden="true" /> : null}
    </span>
  );
}
