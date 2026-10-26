import {
  Avatar,
  Badge,
  Box,
  Button,
  Input,
  SegmentedControl,
  Text,
  cn,
  hrChrome,
} from '@inventory-platform/ui-kit';
import {
  DAY_STATUS_LABELS,
  MAX_ATTENDANCE_NOTE_LENGTH,
  isFullDayLeave,
  takesNote,
  takesTimes,
  type AttendanceDraft,
  type AttendanceRowResponse,
} from '@inventory-platform/hr/types';
import { AttendanceMark } from './AttendanceMark';
import { AttendanceNotePopover } from './AttendanceNotePopover';

/** Segment value that opens the record-leave modal instead of changing the draft. */
export const LEAVE_SEGMENT = 'LEAVE';

const MARK_OPTIONS = [
  { value: 'PRESENT', label: 'P', ariaLabel: 'Present' },
  { value: 'ABSENT', label: 'A', ariaLabel: 'Absent' },
  { value: 'HALF_DAY', label: 'Half-day' },
];
const LEAVE_OPTION = { value: LEAVE_SEGMENT, label: 'Leave' };

export interface AttendanceDailyRowProps {
  row: AttendanceRowResponse;
  draft: AttendanceDraft;
  changed: boolean;
  /** MARK_ATTENDANCE and the month is open. */
  editable: boolean;
  error?: string | null;
  onChange: (draft: AttendanceDraft) => void;
  /** "Leave" was pressed: record leave for this day (never saved as a mark). */
  onLeave: () => void;
}

/**
 * One employee on the daily register (R5.2–R5.7). Run F9: one compact line on wide screens —
 * avatar, name and code/designation with small chips | P / A / Half-day / Leave | in/out times
 * (only for Present and Half-day) | note (popover) and Clear — and two tight lines when the list
 * is narrow (phones).
 */
export function AttendanceDailyRow({
  row,
  draft,
  changed,
  editable,
  error,
  onChange,
  onLeave,
}: AttendanceDailyRowProps) {
  const fullDayLeave = isFullDayLeave(row);
  const canEditRow = editable && !fullDayLeave;
  const times = takesTimes(draft.status);
  const derivedOff = row.source === 'WEEK_OFF' || row.source === 'HOLIDAY';
  // A half-day leave already covers half the day, so "Leave" is not offered for the other half.
  const options = row.halfDayLeave ? MARK_OPTIONS : [...MARK_OPTIONS, LEAVE_OPTION];
  const leaveHint = fullDayLeave && editable;
  const meta = [row.code, row.designation].filter(Boolean).join(' · ');
  const readOnlySummary =
    [
      row.inTime ? `In ${row.inTime}` : null,
      row.outTime ? `Out ${row.outTime}` : null,
      row.note || null,
    ]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <Box className={hrChrome.hrDailyRow} role="listitem" aria-label={row.name}>
      <Box className={hrChrome.hrDailyRowWho}>
        <Avatar name={row.name} size="sm" className={hrChrome.hrDailyRowAvatar} />
        <Box className={hrChrome.hrDailyRowName}>
          <Text as="span" weight="semibold" truncate>
            {row.name}
          </Text>
          <Box as="span" className={hrChrome.hrDailyRowMeta}>
            {row.late ? (
              <Badge variant="warning" className={hrChrome.hrChip}>
                Late
              </Badge>
            ) : null}
            {fullDayLeave ? (
              <Badge variant="info" className={hrChrome.hrChip}>
                On leave
              </Badge>
            ) : null}
            {row.halfDayLeave ? (
              <Badge variant="info" className={hrChrome.hrChip}>
                Half-day leave
              </Badge>
            ) : null}
            {derivedOff && !changed ? (
              <Badge variant="neutral" className={hrChrome.hrChip}>
                {DAY_STATUS_LABELS[row.status]}
              </Badge>
            ) : null}
            {changed ? (
              <Badge variant="neutral" className={hrChrome.hrChip}>
                Not saved
              </Badge>
            ) : null}
            {/* Chips first so they are never clipped; the code · designation text shrinks. */}
            {meta ? (
              <Text
                as="span"
                variant="caption"
                color="muted"
                truncate
                className={hrChrome.hrDailyRowMetaText}
              >
                {meta}
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Box className={hrChrome.hrDailyRowStatus}>
        {canEditRow ? (
          <SegmentedControl<string>
            size="sm"
            aria-label={`Attendance for ${row.name}`}
            options={options}
            // Week-off, holiday and unmarked days have no pressed segment until one is picked.
            value={draft.status}
            onChange={(v) => {
              if (v === LEAVE_SEGMENT) {
                onLeave();
                return;
              }
              const status = v as AttendanceDraft['status'];
              onChange({
                ...draft,
                status,
                inTime: takesTimes(status) ? draft.inTime : '',
                outTime: takesTimes(status) ? draft.outTime : '',
              });
            }}
          />
        ) : (
          <>
            <AttendanceMark status={row.status} late={row.late} />
            <Text as="span" variant="caption">
              {DAY_STATUS_LABELS[row.status]}
            </Text>
          </>
        )}
      </Box>

      <Box
        className={cn(hrChrome.hrDailyRowControls, leaveHint && hrChrome.hrDailyRowControlsWide)}
      >
        {canEditRow ? (
          // Times only where they mean something: Present and Half-day.
          times ? (
            <>
              <Input
                type="time"
                aria-label={`In time, ${row.name}`}
                className={hrChrome.hrTimeInput}
                value={draft.inTime}
                onChange={(e) => onChange({ ...draft, inTime: e.target.value })}
              />
              <Input
                type="time"
                aria-label={`Out time, ${row.name}`}
                className={hrChrome.hrTimeInput}
                value={draft.outTime}
                onChange={(e) => onChange({ ...draft, outTime: e.target.value })}
              />
            </>
          ) : null
        ) : leaveHint ? (
          // A sentence, not a value: never truncated; it spans the times and actions columns.
          <Text as="span" variant="caption" color="secondary">
            Change or cancel the leave on the Leave page.
          </Text>
        ) : (
          <Text as="span" variant="caption" color="secondary" truncate>
            {readOnlySummary}
          </Text>
        )}
      </Box>

      <Box className={hrChrome.hrDailyRowActions}>
        {canEditRow && takesNote(draft.status) ? (
          <AttendanceNotePopover
            name={row.name}
            value={draft.note}
            maxLength={MAX_ATTENDANCE_NOTE_LENGTH}
            onChange={(note) => onChange({ ...draft, note })}
          />
        ) : null}
        {/* Only a stored mark can be cleared; the day then falls back to week-off, holiday or
            unmarked. */}
        {canEditRow && row.source === 'MARK' && draft.status !== 'UNMARKED' ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Clear mark for ${row.name}`}
            onClick={() => onChange({ status: 'UNMARKED', inTime: '', outTime: '', note: '' })}
          >
            Clear
          </Button>
        ) : null}
      </Box>

      {error ? (
        <Text variant="caption" color="danger" role="alert" className={hrChrome.hrDailyRowError}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
