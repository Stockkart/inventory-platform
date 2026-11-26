import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  DateStepper,
  EmptyState,
  PageHeader,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  NO_REGISTER_FILTERS,
  buildSaveRows,
  draftChanged,
  draftFromRow,
  formatDayShort,
  formatMonth,
  hasRegisterFilters,
  matchesRegisterFilters,
  todayIso,
  validateDraft,
  type AttendanceDraft,
  type AttendanceRowResponse,
  type MarkUnmarkedPresentRequest,
  type RegisterFilters,
  type SaveAttendanceDayRow,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { HrInbox } from '../ui/HrInbox';
import {
  useDailyRegisterQuery,
  useMarkUnmarkedPresentMutation,
  useSaveAttendanceDaysMutation,
} from '../queries/hooks';
import { AttendanceDailyRow } from '../ui/AttendanceDailyRow';
import { MarkReasonModal } from '../ui/MarkReasonModal';
import { RecordLeaveModal } from '../ui/RecordLeaveModal';
import { RegisterFilterBar } from '../ui/RegisterFilterBar';

export const ATTENDANCE_DAILY_PATH = '/dashboard/hr/attendance';
export const ATTENDANCE_MONTH_PATH = '/dashboard/hr/attendance/month';

/** Edits for one date only; switching the date drops them (they belong to that day's rows). */
interface DraftState {
  date: string;
  byEmployee: Record<string, AttendanceDraft>;
}

/**
 * Daily attendance register (R5.2–R5.10, R5.16): one row per employee employed that day, quick
 * P / A / Half-day / Leave marks, optional times and a note, saved together (changed rows only).
 * Leave is recorded as approved leave, never as a mark. Locked months and users without
 * MARK_ATTENDANCE get a read-only register. A hand-made mark for an employee who uses the
 * Attendance app asks for a reason first (R7.2, `MarkReasonModal`).
 */
export function AttendanceDailyPage() {
  const navigate = useNavigate();
  const { can } = useHrAccess();
  const canView = can('VIEW_ATTENDANCE');
  const canMark = can('MARK_ATTENDANCE');
  const today = todayIso();

  const [date, setDate] = useState(today);
  const [drafts, setDrafts] = useState<DraftState>({ date: today, byEmployee: {} });
  const [leaveFor, setLeaveFor] = useState<AttendanceRowResponse | null>(null);
  /** Which save is waiting on the hand-mark reason prompt (R7.2); null = prompt closed. */
  const [reasonFor, setReasonFor] = useState<'save' | 'markAll' | null>(null);
  /** "Source" and "Flagged" (R8.10–R8.11); narrow the list only, never what is saved. */
  const [filters, setFilters] = useState<RegisterFilters>(NO_REGISTER_FILTERS);

  const daily = useDailyRegisterQuery(date, canView);
  const save = useSaveAttendanceDaysMutation();
  const markAll = useMarkUnmarkedPresentMutation();

  const rows = useMemo(() => daily.data?.rows ?? [], [daily.data]);
  const shownRows = useMemo(
    () => rows.filter((r) => matchesRegisterFilters(r, filters)),
    [rows, filters],
  );
  const locked = daily.data?.locked === true;
  const editable = canMark && !locked;
  const edits = drafts.date === date ? drafts.byEmployee : {};

  const draftOf = (row: AttendanceRowResponse) => edits[row.employeeId] ?? draftFromRow(row);
  const changes = buildSaveRows(date, rows, edits);
  const rowErrors = rows
    .map((r) => [r.employeeId, edits[r.employeeId] ? validateDraft(edits[r.employeeId]) : null])
    .filter((e): e is [string, string] => e[1] != null);
  const unmarkedRows = rows.filter((r) => r.status === 'UNMARKED');
  const unmarked = unmarkedRows.length;
  const dirty = changes.length > 0;

  // Rows whose hand-made mark needs a reason (R7.2): Biometric app check-in on and an active
  // paired phone, as the server said when the register was read. Other rows save as before (R7.1).
  const needsReason = (employeeId: string) =>
    rows.find((r) => r.employeeId === employeeId)?.markReasonRequired === true;
  const changesNeedingReason = changes.filter((c) => needsReason(c.employeeId));
  const unmarkedNeedingReason = unmarkedRows.filter((r) => r.markReasonRequired === true);
  const reasonNames = (
    reasonFor === 'markAll'
      ? unmarkedNeedingReason
      : changesNeedingReason.map((c) => rows.find((r) => r.employeeId === c.employeeId))
  )
    .map((r) => r?.name)
    .filter((n): n is string => n != null);

  const changeDate = (next: string) => {
    setDate(next);
    setDrafts({ date: next, byEmployee: {} });
  };

  const setDraft = (employeeId: string, draft: AttendanceDraft) =>
    setDrafts({ date, byEmployee: { ...edits, [employeeId]: draft } });

  const discard = () => {
    setDrafts({ date, byEmployee: {} });
  };

  const submitSave = (toSave: SaveAttendanceDayRow[]) => {
    save.mutate(toSave, {
      onSuccess: (saved) => {
        useNotify.success(
          `Saved attendance for ${saved.length} employee${saved.length === 1 ? '' : 's'}`,
        );
        setReasonFor(null);
        discard();
      },
      // Plain-English server message, e.g. locked month, "change or cancel the leave first" or
      // "A reason is required when the employee uses the Attendance app". Edits are kept, so the
      // day is left as it was.
      onError: (err) => useNotify.error(err.message || 'Could not save attendance'),
    });
  };

  const handleSave = () => {
    if (rowErrors.length > 0) {
      useNotify.error('Please fix the highlighted rows.');
      return;
    }
    if (changesNeedingReason.length > 0) {
      setReasonFor('save');
      return;
    }
    submitSave(changes);
  };

  const submitMarkAll = (body: MarkUnmarkedPresentRequest) => {
    markAll.mutate(body, {
      onSuccess: (res) => {
        useNotify.success(
          res.marked === 0
            ? 'Everyone is already marked'
            : `Marked ${res.marked} employee${res.marked === 1 ? '' : 's'} as Present`,
        );
        setReasonFor(null);
      },
      onError: (err) => useNotify.error(err.message || 'Could not mark attendance'),
    });
  };

  const handleMarkAll = () => {
    // One reason covers the whole batch (`MarkUnmarkedPresentRequest.reason`); the server refuses
    // the batch without it when anyone being marked uses the Attendance app.
    if (unmarkedNeedingReason.length > 0) {
      setReasonFor('markAll');
      return;
    }
    submitMarkAll({ dates: [date] });
  };

  const confirmReason = (fields: Pick<SaveAttendanceDayRow, 'reason' | 'reasonText'>) => {
    if (reasonFor === 'markAll') {
      submitMarkAll({ dates: [date], ...fields });
    } else {
      submitSave(changes.map((c) => (needsReason(c.employeeId) ? { ...c, ...fields } : c)));
    }
  };

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see attendance in this shop.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        description="Mark who came in today. Changes are saved together."
        actions={<HrInbox />}
      />

      <Box className={hrChrome.hrPageToolbar}>
        <DateStepper
          value={date}
          onChange={changeDate}
          max={today}
          today={today}
          label="Attendance date"
        />
        <Box className={hrChrome.hrPageToolbarEnd}>
          <Button type="button" variant="outline" onClick={() => navigate(ATTENDANCE_MONTH_PATH)}>
            Month register
          </Button>
          {editable ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAll}
              loading={markAll.isPending}
              // Saving first keeps unsaved edits from being overtaken by the bulk mark.
              disabled={unmarked === 0 || dirty || markAll.isPending}
            >
              Mark all unmarked as Present
            </Button>
          ) : null}
        </Box>
      </Box>

      {rows.length > 0 ? (
        <RegisterFilterBar
          filters={filters}
          onChange={setFilters}
          showFlagged
          shown={{ matched: shownRows.length, total: rows.length }}
        />
      ) : null}

      {locked ? (
        <Alert variant="warning">
          Payroll for {formatMonth(date.slice(0, 7))} is finalised, so this day cannot be changed.
          Reopen payroll to change it.
        </Alert>
      ) : null}
      {!canMark ? (
        <Alert variant="info">You can see attendance but not mark or change it.</Alert>
      ) : null}
      {daily.error ? <Alert variant="danger">{daily.error.message}</Alert> : null}

      {daily.isLoading ? (
        <CenteredLoader label="Loading attendance…" />
      ) : rows.length === 0 && !daily.error ? (
        <EmptyState
          title={`Nobody to mark on ${formatDayShort(date)}`}
          description="Add your employees first; everyone employed on a day shows up here."
          action={
            <Button
              type="button"
              variant="solid"
              onClick={() => navigate('/dashboard/hr/employees')}
            >
              Go to employees
            </Button>
          }
        />
      ) : rows.length > 0 ? (
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text
                as="span"
                variant="caption"
                color="secondary"
                aria-live="polite"
                className={hrChrome.hrDailySummary}
              >
                {formatDayShort(date)} · {rows.length} employee{rows.length === 1 ? '' : 's'} ·{' '}
                {unmarked} unmarked
                {dirty ? ` · ${changes.length} not saved` : ''}
              </Text>
              {shownRows.length === 0 && hasRegisterFilters(filters) ? (
                <Text color="muted">No employee matches these filters on this day.</Text>
              ) : null}
              <Box
                role="list"
                aria-label={`Attendance on ${formatDayShort(date)}`}
                className={hrChrome.hrDailyList}
              >
                {shownRows.map((row) => {
                  const draft = draftOf(row);
                  return (
                    <AttendanceDailyRow
                      key={row.employeeId}
                      row={row}
                      draft={draft}
                      changed={draftChanged(row, draft)}
                      editable={editable}
                      error={rowErrors.find(([id]) => id === row.employeeId)?.[1]}
                      onChange={(d) => setDraft(row.employeeId, d)}
                      onLeave={() => setLeaveFor(row)}
                    />
                  );
                })}
              </Box>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      {editable && rows.length > 0 ? (
        <Box className={hrChrome.hrPageToolbar}>
          <Box className={hrChrome.hrPageToolbarEnd}>
            <Button
              type="button"
              variant="ghost"
              onClick={discard}
              disabled={!dirty || save.isPending}
            >
              Discard changes
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={handleSave}
              loading={save.isPending}
              disabled={!dirty || save.isPending}
            >
              {dirty ? `Save ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'Save'}
            </Button>
          </Box>
        </Box>
      ) : null}

      <MarkReasonModal
        open={reasonFor != null}
        employeeNames={reasonNames}
        saveLabel={
          reasonFor === 'markAll'
            ? 'Mark as Present'
            : `Save ${changes.length} change${changes.length === 1 ? '' : 's'}`
        }
        saving={save.isPending || markAll.isPending}
        onClose={() => setReasonFor(null)}
        onConfirm={confirmReason}
      />

      <RecordLeaveModal
        open={leaveFor != null}
        onClose={() => setLeaveFor(null)}
        employee={
          leaveFor
            ? { employeeId: leaveFor.employeeId, code: leaveFor.code, name: leaveFor.name }
            : undefined
        }
        defaultDate={date}
        fixedDates
        onRecorded={() => {
          // The day is Leave now; any unsaved edit for this row would only be rejected.
          if (leaveFor && edits[leaveFor.employeeId]) {
            const rest = { ...edits };
            delete rest[leaveFor.employeeId];
            setDrafts({ date, byEmployee: rest });
          }
        }}
      />
    </Stack>
  );
}
