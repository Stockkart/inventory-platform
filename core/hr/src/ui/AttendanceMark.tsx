import { Smartphone } from 'lucide-react';
import {
  ATTENDANCE_STATUS_META,
  AttendanceCell,
  Box,
  Icon,
  Text,
  VisuallyHidden,
  hrChrome,
  type AttendanceStatus,
} from '@inventory-platform/ui-kit';
import type { DayStatus } from '@inventory-platform/hr/types';

export interface AttendanceMarkProps {
  status: DayStatus;
  late?: boolean;
  /** Spoken prefix, e.g. "Ravi Kumar, Mon, 6 Oct". */
  context?: string;
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
  return <AttendanceCell status={status} late={late} context={context} size={size} />;
}

/** Small phone icon for a day filled by self check-in; nothing for a day marked by hand. */
export function CaptureSourceIcon({ source }: { source?: string | null }) {
  if (source !== 'SELF_CHECK_IN') return null;
  return (
    <Icon
      icon={Smartphone}
      size={12}
      className={hrChrome.hrSourceIcon}
      role="img"
      aria-hidden={false}
      aria-label="by phone"
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
    </Box>
  );
}
