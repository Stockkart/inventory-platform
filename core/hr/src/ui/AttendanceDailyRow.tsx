import {
  Badge,
  Box,
  Button,
  Input,
  Inline,
  SegmentedControl,
  Stack,
  Text,
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

/** One employee on the daily register (R5.2–R5.7); a single column below 768 px. */
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

  return (
    <Box className={hrChrome.hrDailyRow} role="listitem" aria-label={row.name}>
      <Stack gap="xs" className={hrChrome.hrDailyRowName}>
        <Text weight="semibold" truncate>
          {row.name}
        </Text>
        <Inline gap="xs" flexWrap>
          <Text as="span" variant="caption" color="muted">
            {row.code}
            {row.designation ? ` · ${row.designation}` : ''}
          </Text>
          {row.late ? <Badge variant="warning">Late</Badge> : null}
          {fullDayLeave ? <Badge variant="info">On leave</Badge> : null}
          {row.halfDayLeave ? <Badge variant="info">Half-day leave</Badge> : null}
          {derivedOff && !changed ? (
            <Badge variant="neutral">{DAY_STATUS_LABELS[row.status]}</Badge>
          ) : null}
          {changed ? <Badge variant="neutral">Not saved</Badge> : null}
        </Inline>
      </Stack>

      {canEditRow ? (
        <SegmentedControl<string>
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
        <Inline gap="xs">
          <AttendanceMark status={row.status} late={row.late} size="md" />
          <Text as="span">{DAY_STATUS_LABELS[row.status]}</Text>
        </Inline>
      )}

      <Stack gap="xs">
        {canEditRow ? (
          <Box className={hrChrome.hrDailyRowControls}>
            <Input
              type="time"
              aria-label={`In time, ${row.name}`}
              className={hrChrome.hrTimeInput}
              value={draft.inTime}
              disabled={!times}
              onChange={(e) => onChange({ ...draft, inTime: e.target.value })}
            />
            <Input
              type="time"
              aria-label={`Out time, ${row.name}`}
              className={hrChrome.hrTimeInput}
              value={draft.outTime}
              disabled={!times}
              onChange={(e) => onChange({ ...draft, outTime: e.target.value })}
            />
            <Input
              aria-label={`Note, ${row.name}`}
              placeholder="Note"
              value={draft.note}
              maxLength={MAX_ATTENDANCE_NOTE_LENGTH}
              disabled={!takesNote(draft.status)}
              onChange={(e) => onChange({ ...draft, note: e.target.value })}
            />
            {/* Only a stored mark can be cleared; the day then falls back to week-off,
                holiday or unmarked. */}
            {row.source === 'MARK' && draft.status !== 'UNMARKED' ? (
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
        ) : (
          <Text variant="caption" color="secondary">
            {fullDayLeave && editable
              ? 'Change or cancel the leave on the Leave page.'
              : [
                  row.inTime ? `In ${row.inTime}` : null,
                  row.outTime ? `Out ${row.outTime}` : null,
                  row.note || null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
          </Text>
        )}
        {error ? (
          <Text variant="caption" color="danger" role="alert">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}
