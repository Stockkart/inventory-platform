import { Fingerprint, Hand, Smartphone, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Icon } from '../icons';
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

/**
 * Where a day's mark came from, one icon each (HR R8.1): a hand for a mark made by a person, a
 * phone for My HR self check-in, a fingerprint for the Attendance app.
 */
export type AttendanceSourceKind = 'HAND' | 'PHONE' | 'APP';

/** Icon and spoken suffix for each source; the suffix follows the status word: "Present, by hand". */
export const ATTENDANCE_SOURCE_META: Record<
  AttendanceSourceKind,
  { icon: LucideIcon; word: string }
> = {
  HAND: { icon: Hand, word: 'by hand' },
  PHONE: { icon: Smartphone, word: 'by phone' },
  APP: { icon: Fingerprint, word: 'by Attendance app' },
};

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
  /**
   * Where the mark came from: a small icon on the cell's corner and ", by hand" / ", by phone" /
   * ", by Attendance app" at the end of the spoken label. Omit for a day with no mark.
   */
  source?: AttendanceSourceKind | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * One attendance mark: a short letter on a status colour, with a dot when the person was late and
 * a source icon when the caller says where the mark came from. Colour is never the only signal —
 * the letter is visible and screen readers hear the full word.
 */
export function AttendanceCell({
  status,
  late = false,
  context,
  source,
  size = 'md',
  className,
}: AttendanceCellProps) {
  const meta = ATTENDANCE_STATUS_META[status];
  const sourceMeta = source ? ATTENDANCE_SOURCE_META[source] : null;
  const spoken = `${context ? `${context}: ` : ''}${meta.word}${late ? ', late' : ''}${
    sourceMeta ? `, ${sourceMeta.word}` : ''
  }`;
  return (
    <span
      role="img"
      aria-label={spoken}
      title={spoken}
      className={cn(styles.cell, styles[size], STATUS_CLASS[status], className)}
    >
      <span aria-hidden="true">{meta.letter}</span>
      {late ? <span className={styles.lateDot} aria-hidden="true" /> : null}
      {sourceMeta ? (
        <Icon icon={sourceMeta.icon} size={10} className={styles.sourceIcon} data-source={source} />
      ) : null}
    </span>
  );
}
