import {
  ATTENDANCE_SOURCE_META,
  ATTENDANCE_STATUS_META,
  AttendanceCell,
  Box,
  Icon,
  Text,
  VisuallyHidden,
  hrChrome,
  type AttendanceStatus,
} from '@inventory-platform/ui-kit';
import type { DayStatus, RegisterSource } from '@inventory-platform/hr/types';

export interface AttendanceMarkProps {
  status: DayStatus;
  late?: boolean;
  /** Spoken prefix, e.g. "Ravi Kumar, Mon, 6 Oct". */
  context?: string;
  /**
   * Where the mark came from (R8.1): a small corner icon and ", by hand" / ", by phone" / ", by
   * Attendance app" in the spoken label. Omit for a day with no mark and no punch.
   */
  source?: RegisterSource | null;
  size?: 'sm' | 'md';
  /**
   * A day after today with nothing resolved (server `future` flag + UNMARKED, run B6): blank and
   * muted, read as "not yet" (nothing can be marked yet).
   */
  future?: boolean;
}

/**
 * `AttendanceCell` for any resolved status. NOT_EMPLOYED (before joining / after exit) has no
 * mark of its own, so it is a blank cell that still says what it is to screen readers. A future
 * day is blank too when the caller says so (only future Unmarked days; a future holiday or leave
 * keeps its mark).
 */
export function AttendanceMark({
  status,
  late,
  context,
  source,
  size = 'sm',
  future,
}: AttendanceMarkProps) {
  if (future && status !== 'NOT_EMPLOYED') {
    return (
      <Text as="span" variant="caption" color="muted">
        <VisuallyHidden>{context ? `${context}: ` : ''}not yet</VisuallyHidden>
      </Text>
    );
  }
  if (status === 'NOT_EMPLOYED') {
    return (
      <Text as="span" variant="caption" color="muted">
        <Box as="span" aria-hidden>
          ·
        </Box>
        <VisuallyHidden>{context ? `${context}: ` : ''}Not employed</VisuallyHidden>
      </Text>
    );
  }
  return (
    <AttendanceCell status={status} late={late} context={context} source={source} size={size} />
  );
}

export interface CaptureSourceIconProps {
  /** `daySourceIcon(row)` or `sourceOfPunch(punch.source)`; null or unknown renders nothing. */
  source?: RegisterSource | null;
  /** The word is written next to it, so the icon itself is not read out. */
  decorative?: boolean;
  size?: number;
}

/**
 * Small source icon (R8.1): hand for a mark made by a person, phone for My HR self check-in,
 * fingerprint for the Attendance app; nothing for a day with no mark and no punch. Read as
 * "by hand" / "by phone" / "by Attendance app" unless `decorative`.
 */
export function CaptureSourceIcon({
  source,
  decorative = false,
  size = 12,
}: CaptureSourceIconProps) {
  if (!source) return null;
  const meta = ATTENDANCE_SOURCE_META[source];
  return (
    <Icon
      icon={meta.icon}
      size={size}
      className={hrChrome.hrSourceIcon}
      data-source={source}
      {...(decorative
        ? {}
        : { role: 'img' as const, 'aria-hidden': false, 'aria-label': meta.word })}
    />
  );
}

const LEGEND_ORDER: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'LEAVE',
  'WEEK_OFF',
  'HOLIDAY',
  'UNMARKED',
];

/** Colour/letter key for registers and calendars. */
export function AttendanceLegend() {
  return (
    <Box className={hrChrome.hrLegend} role="list" aria-label="Attendance key">
      {LEGEND_ORDER.map((s) => (
        <Box as="span" role="listitem" key={s} className={hrChrome.hrLegendItem}>
          {/* The word follows, so the mark itself is not read twice. */}
          <Box as="span" aria-hidden>
            <AttendanceCell status={s} size="sm" />
          </Box>
          <Text as="span" variant="caption">
            {ATTENDANCE_STATUS_META[s].word}
          </Text>
        </Box>
      ))}
      <Box as="span" role="listitem" className={hrChrome.hrLegendItem}>
        <Box as="span" aria-hidden>
          <AttendanceCell status="PRESENT" late size="sm" />
        </Box>
        <Text as="span" variant="caption">
          Dot: came in late
        </Text>
      </Box>
      {/* One icon per source (R8.1): the register shows it on the mark's corner. */}
      <Box as="span" role="listitem" className={hrChrome.hrLegendItem}>
        <Box as="span" aria-hidden>
          <CaptureSourceIcon source="HAND" decorative />
        </Box>
        <Text as="span" variant="caption">
          Hand: marked by a person
        </Text>
      </Box>
      <Box as="span" role="listitem" className={hrChrome.hrLegendItem}>
        <Box as="span" aria-hidden>
          <CaptureSourceIcon source="PHONE" decorative />
        </Box>
        <Text as="span" variant="caption">
          Phone: My HR check-in
        </Text>
      </Box>
      <Box as="span" role="listitem" className={hrChrome.hrLegendItem}>
        <Box as="span" aria-hidden>
          <CaptureSourceIcon source="APP" decorative />
        </Box>
        <Text as="span" variant="caption">
          Fingerprint: Attendance app
        </Text>
      </Box>
    </Box>
  );
}
