import { useId } from 'react';
import {
  Alert,
  Box,
  Drawer,
  IconButton,
  Inline,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import {
  AUDIT_ACTION_LABELS,
  DAY_STATUS_LABELS,
  formatDateTime,
  formatDayShort,
  isBlankFutureCell,
  type AuditEventResponse,
  type DayStatus,
  type MonthRegisterCell,
} from '@inventory-platform/hr/types';
import { useAttendanceHistoryQuery } from '../queries/hooks';
import { AttendanceMark } from './AttendanceMark';

export interface AttendanceDayDrawerProps {
  /** null = closed. */
  day: { employeeId: string; name: string; date: string; cell: MonthRegisterCell } | null;
  /** MARK_ATTENDANCE: history is only served to users who can fix attendance (R5.15). */
  canSeeHistory: boolean;
  onClose: () => void;
}

function statusWord(value: unknown): string | null {
  return typeof value === 'string' && value in DAY_STATUS_LABELS
    ? DAY_STATUS_LABELS[value as DayStatus]
    : null;
}

/** "Mark changed: Absent → Present" when the payload carries statuses; else just the action. */
function describeEvent(e: AuditEventResponse): string {
  const label = AUDIT_ACTION_LABELS[e.action] ?? 'Changed';
  const before = statusWord(e.before?.status);
  const after = statusWord(e.after?.status);
  if (before || after) return `${label}: ${before ?? 'Unmarked'} → ${after ?? 'Unmarked'}`;
  return label;
}

/**
 * Side drawer for one employee-day of the month register: the resolved status, and for
 * MARK_ATTENDANCE users who marked it first and every later change, newest first.
 */
export function AttendanceDayDrawer({ day, canSeeHistory, onClose }: AttendanceDayDrawerProps) {
  const titleId = useId();
  const myUserId = useAuthStore((s) => s.user?.userId ?? null);
  // A future day has no marks and no history yet, so nothing is fetched for it. "Future" is the
  // server's flag (run B6); only a future Unmarked day is blank, a future holiday or leave still
  // shows its status.
  const future = day?.cell.future === true;
  const blank = day != null && isBlankFutureCell(day.cell);
  const history = useAttendanceHistoryQuery(
    day?.employeeId,
    day?.date,
    canSeeHistory && !!day && !future,
  );
  // "you" for the signed-in user, else the name the server sends (null = unknown login).
  const who = (userId: string | null | undefined, name: string | null | undefined) =>
    userId && userId === myUserId ? 'you' : name ?? 'someone';

  return (
    <Drawer open={day != null} onClose={onClose} side="right" labelledBy={titleId}>
      {day ? (
        <Box className={hrChrome.hrDayDrawer}>
          <Inline justify="between" align="start" gap="sm">
            <Stack gap="xs">
              <Text variant="heading4" as="h2" id={titleId}>
                {day.name}
              </Text>
              <Text color="secondary">{formatDayShort(day.date)}</Text>
            </Stack>
            <IconButton label="Close day detail" onClick={onClose}>
              ×
            </IconButton>
          </Inline>

          {blank ? (
            <Text color="muted">Not yet. This day has not come yet.</Text>
          ) : (
            <Inline gap="sm">
              <AttendanceMark status={day.cell.status} late={day.cell.late ?? false} size="md" />
              <Text>
                {DAY_STATUS_LABELS[day.cell.status]}
                {day.cell.halfDayLeave
                  ? ` (half-day leave; other half ${DAY_STATUS_LABELS[
                      day.cell.otherHalf ?? 'UNMARKED'
                    ].toLowerCase()})`
                  : ''}
                {day.cell.late ? ', came in late' : ''}
              </Text>
            </Inline>
          )}

          {canSeeHistory && !future ? (
            <Stack gap="sm">
              <Text variant="heading4" as="h3">
                History
              </Text>
              {history.isLoading ? (
                <Text color="muted">Loading history…</Text>
              ) : history.error ? (
                <Alert variant="danger">{history.error.message}</Alert>
              ) : history.data ? (
                <Stack as="ul" gap="sm" aria-label="Changes to this day">
                  {(history.data.events ?? []).map((e, i) => (
                    <Box as="li" key={`${e.at}-${i}`}>
                      <Text>{describeEvent(e)}</Text>
                      <Text variant="caption" color="muted">
                        {formatDateTime(e.at)} by {who(e.actorUserId, e.actorName)}
                        {e.reason ? ` · ${e.reason}` : ''}
                      </Text>
                    </Box>
                  ))}
                  {history.data.markedAt ? (
                    <Box as="li">
                      <Text>
                        First marked
                        {history.data.source === 'BULK_PRESENT'
                          ? ' with “Mark all as Present”'
                          : ''}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatDateTime(history.data.markedAt)} by{' '}
                        {who(history.data.markedByUserId, history.data.actorName)}
                      </Text>
                    </Box>
                  ) : (history.data.events ?? []).length === 0 ? (
                    <Box as="li">
                      <Text color="muted">Nobody has marked this day.</Text>
                    </Box>
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      ) : null}
    </Drawer>
  );
}
