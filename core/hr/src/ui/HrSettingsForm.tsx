import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  FormField,
  FormRow,
  Inline,
  Input,
  MonthPicker,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  DAY_LABELS,
  DAYS_OF_WEEK,
  LEAVE_YEAR_LABELS,
  PER_DAY_BASIS_LABELS,
  currentMonth,
  cycleRange,
  formatDateRange,
  formatMonth,
  type DayOfWeek,
  type HrSettingsResponse,
  type LeaveYearStartMonth,
  type PerDayBasis,
  type UpdateHrSettingsRequest,
} from '@inventory-platform/hr/types';
import { useUpdateHrSettingsMutation } from '../queries/hooks';

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
/** Backend default weekly off (R2.2). */
const DEFAULT_WEEKLY_OFF: readonly DayOfWeek[] = ['SUNDAY'];

interface SettingsDraft {
  weeklyOffDays: DayOfWeek[];
  weeklyOffFrom: string;
  workStart: string;
  workEnd: string;
  graceMinutes: string;
  halfDayBelowHours: string;
  overtimeEnabled: boolean;
  overtimeMultiplier: string;
  perDayBasis: PerDayBasis;
  leaveYearStartMonth: LeaveYearStartMonth;
  payCycleStartDay: string;
}

function draftFrom(s: HrSettingsResponse): SettingsDraft {
  return {
    weeklyOffDays: [...(s.currentWeeklyOffDays ?? DEFAULT_WEEKLY_OFF)],
    weeklyOffFrom: currentMonth(),
    workStart: s.workStart ?? '09:00',
    workEnd: s.workEnd ?? '21:00',
    graceMinutes: String(s.graceMinutes ?? 15),
    halfDayBelowHours: String(s.halfDayBelowHours ?? 4),
    overtimeEnabled: s.overtimeEnabled ?? false,
    overtimeMultiplier: String(s.overtimeMultiplier ?? 1.5),
    perDayBasis: s.perDayBasis ?? 'CALENDAR_DAYS',
    leaveYearStartMonth: s.leaveYearStartMonth ?? 'JANUARY',
    payCycleStartDay: String(s.payCycleStartDay ?? 1),
  };
}

function sameDays(a: readonly DayOfWeek[], b: readonly DayOfWeek[]) {
  return a.length === b.length && a.every((d) => b.includes(d));
}

/** Same limits and messages as the backend `HrSettingsValidator`. */
function validate(d: SettingsDraft): string | null {
  if (d.weeklyOffDays.length === 0) return 'Choose at least one weekly off day';
  if (d.weeklyOffDays.length === 7) return 'At least one day of the week must be a working day';
  if (!TIME.test(d.workStart)) return 'Work start must be a time like 09:00';
  if (!TIME.test(d.workEnd)) return 'Work end must be a time like 21:00';
  if (d.workStart >= d.workEnd) return 'Work start must be before work end (no overnight hours)';
  const grace = Number(d.graceMinutes);
  if (!Number.isInteger(grace) || grace < 0 || grace > 240) {
    return 'Grace minutes must be between 0 and 240';
  }
  const half = Number(d.halfDayBelowHours);
  if (!d.halfDayBelowHours.trim() || !Number.isFinite(half) || half <= 0 || half >= 24) {
    return 'Half-day hours must be more than 0 and less than 24';
  }
  const mult = Number(d.overtimeMultiplier);
  if (!d.overtimeMultiplier.trim() || !Number.isFinite(mult) || mult < 1 || mult > 5) {
    return 'Overtime multiplier must be between 1 and 5';
  }
  if (cycleStartDay(d.payCycleStartDay) == null) {
    return 'Salary month start day must be a whole number from 1 to 28';
  }
  return null;
}

/** Salary month start day typed in the form; null = not a whole number from 1 to 28. */
function cycleStartDay(text: string): number | null {
  if (!/^\d{1,2}$/.test(text.trim())) return null;
  const day = Number(text);
  return day >= 1 && day <= 28 ? day : null;
}

const PER_DAY_OPTIONS = (Object.keys(PER_DAY_BASIS_LABELS) as PerDayBasis[]).map((value) => ({
  value,
  label: PER_DAY_BASIS_LABELS[value],
}));
const LEAVE_YEAR_OPTIONS = (Object.keys(LEAVE_YEAR_LABELS) as LeaveYearStartMonth[]).map(
  (value) => ({ value, label: LEAVE_YEAR_LABELS[value] }),
);

export interface HrSettingsFormProps {
  settings: HrSettingsResponse;
  readOnly: boolean;
}

/** Working rules of the shop (R2): weekly off, hours, grace, half-day, overtime, pay basis. */
export function HrSettingsForm({ settings, readOnly }: HrSettingsFormProps) {
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFrom(settings));
  const [error, setError] = useState<string | null>(null);
  const save = useUpdateHrSettingsMutation();

  // A save (or another tab's save) brings a new revision: start again from the server copy.
  useEffect(() => {
    setDraft(draftFrom(settings));
  }, [settings]);

  const savedDays = useMemo(
    () => settings.currentWeeklyOffDays ?? DEFAULT_WEEKLY_OFF,
    [settings.currentWeeklyOffDays],
  );
  const weeklyOffChanged = !sameDays(draft.weeklyOffDays, savedDays);
  const savedLeaveYear = settings.leaveYearStartMonth ?? 'JANUARY';
  const leaveYearChanged = settings.saved && draft.leaveYearStartMonth !== savedLeaveYear;
  const disabled = readOnly || save.isPending;
  const startDay = cycleStartDay(draft.payCycleStartDay);
  const thisCycle = startDay == null ? null : cycleRange(currentMonth(), startDay);
  const stepDay = (by: number) =>
    set('payCycleStartDay', String(Math.min(28, Math.max(1, (startDay ?? 1) + by))));

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleDay = (day: DayOfWeek) =>
    set(
      'weeklyOffDays',
      draft.weeklyOffDays.includes(day)
        ? draft.weeklyOffDays.filter((d) => d !== day)
        : DAYS_OF_WEEK.filter((d) => d === day || draft.weeklyOffDays.includes(d)),
    );

  const handleSave = () => {
    const problem = validate(draft);
    setError(problem);
    if (problem) return;
    const body: UpdateHrSettingsRequest = {
      // Only send weekly off when it changed: every change adds a dated schedule entry.
      weeklyOff: weeklyOffChanged
        ? { effectiveFrom: draft.weeklyOffFrom, days: draft.weeklyOffDays }
        : null,
      workStart: draft.workStart,
      workEnd: draft.workEnd,
      graceMinutes: Number(draft.graceMinutes),
      halfDayBelowHours: Number(draft.halfDayBelowHours),
      overtimeEnabled: draft.overtimeEnabled,
      overtimeMultiplier: Number(draft.overtimeMultiplier),
      perDayBasis: draft.perDayBasis,
      leaveYearStartMonth: draft.leaveYearStartMonth,
      payCycleStartDay: cycleStartDay(draft.payCycleStartDay),
      // null on the very first save; afterwards the server rejects a stale copy with 409.
      revision: settings.revision ?? null,
    };
    save.mutate(body, {
      onSuccess: () => useNotify.success('HR settings saved'),
      onError: (err) => setError(err.message || 'Could not save HR settings'),
    });
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="heading4" as="h3">
              Working rules
            </Text>
            <Text variant="caption" color="muted">
              How attendance and pay are worked out in this shop.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text variant="label" as="span" id="hr-weekly-off-label">
              Weekly off days
            </Text>
            <Inline gap="xs" flexWrap role="group" aria-labelledby="hr-weekly-off-label">
              {DAYS_OF_WEEK.map((day) => {
                const on = draft.weeklyOffDays.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={on ? 'solid' : 'outline'}
                    aria-pressed={on}
                    aria-label={DAY_LABELS[day].long}
                    disabled={disabled}
                    onClick={() => toggleDay(day)}
                  >
                    {DAY_LABELS[day].short}
                  </Button>
                );
              })}
            </Inline>
            {weeklyOffChanged && !readOnly ? (
              <Stack gap="xs">
                <MonthPicker
                  label="New weekly off applies from"
                  value={draft.weeklyOffFrom}
                  min={currentMonth()}
                  onChange={(v) => set('weeklyOffFrom', v)}
                  disabled={disabled}
                />
                <Text variant="caption" color="muted">
                  Months before {formatMonth(draft.weeklyOffFrom)} keep the old weekly off days.
                </Text>
              </Stack>
            ) : null}
          </Stack>

          <FormRow>
            <FormField label="Shop opens at" id="hr-work-start">
              <Input
                id="hr-work-start"
                type="time"
                value={draft.workStart}
                onChange={(e) => set('workStart', e.target.value)}
                disabled={disabled}
              />
            </FormField>
            <FormField label="Shop closes at" id="hr-work-end">
              <Input
                id="hr-work-end"
                type="time"
                value={draft.workEnd}
                onChange={(e) => set('workEnd', e.target.value)}
                disabled={disabled}
              />
            </FormField>
          </FormRow>

          <FormRow>
            <FormField
              label="Late after (grace minutes)"
              id="hr-grace"
              hint="Someone who comes in later than opening time plus these minutes is marked late."
            >
              <Input
                id="hr-grace"
                type="number"
                inputMode="numeric"
                min={0}
                max={240}
                value={draft.graceMinutes}
                onChange={(e) => set('graceMinutes', e.target.value)}
                disabled={disabled}
              />
            </FormField>
            <FormField
              label="Half-day if worked less than (hours)"
              id="hr-half-day"
              hint="Days with fewer worked hours count as a half-day."
            >
              <Input
                id="hr-half-day"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={23.5}
                step={0.5}
                value={draft.halfDayBelowHours}
                onChange={(e) => set('halfDayBelowHours', e.target.value)}
                disabled={disabled}
              />
            </FormField>
          </FormRow>

          <Stack gap="xs">
            <Switch
              label="Pay overtime"
              checked={draft.overtimeEnabled}
              onChange={(e) => set('overtimeEnabled', e.target.checked)}
              disabled={disabled}
            />
            {draft.overtimeEnabled ? (
              <FormField
                label="Overtime pay rate (times normal pay)"
                id="hr-ot-multiplier"
                hint="For example 1.5 pays one and a half times the normal hourly pay."
              >
                <Input
                  id="hr-ot-multiplier"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={5}
                  step={0.25}
                  value={draft.overtimeMultiplier}
                  onChange={(e) => set('overtimeMultiplier', e.target.value)}
                  disabled={disabled}
                />
              </FormField>
            ) : null}
          </Stack>

          <Stack gap="xs">
            <Text variant="label" as="span">
              A day&apos;s pay for monthly salaries is the salary divided by
            </Text>
            <SegmentedControl
              aria-label="Per-day pay basis"
              value={draft.perDayBasis}
              options={PER_DAY_OPTIONS}
              onChange={(v) => set('perDayBasis', v)}
              disabled={disabled}
            />
          </Stack>

          <Stack gap="xs">
            <Text variant="label" as="span">
              Leave year starts in
            </Text>
            <SegmentedControl
              aria-label="Leave year starts in"
              value={draft.leaveYearStartMonth}
              options={LEAVE_YEAR_OPTIONS}
              onChange={(v) => set('leaveYearStartMonth', v)}
              disabled={disabled}
            />
            {leaveYearChanged ? (
              <Alert variant="warning">
                Changing the start of the leave year moves every employee&apos;s leave balance to
                the new year. Balances are worked out again from{' '}
                {LEAVE_YEAR_LABELS[draft.leaveYearStartMonth]}; leave already taken is not lost.
              </Alert>
            ) : null}
          </Stack>

          <FormField
            label="Salary month starts on day"
            id="hr-pay-cycle-start"
            hint="1 = calendar month. Example: 26 means the October salary covers 26 Sep – 25 Oct, and you can pay it from 26 Oct."
          >
            <Inline gap="xs" align="center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Start one day earlier"
                disabled={disabled || (startDay ?? 1) <= 1}
                onClick={() => stepDay(-1)}
              >
                −
              </Button>
              <Input
                id="hr-pay-cycle-start"
                type="text"
                inputMode="numeric"
                maxLength={2}
                className={hrChrome.hrDayInput}
                value={draft.payCycleStartDay}
                onChange={(e) => set('payCycleStartDay', e.target.value)}
                disabled={disabled}
                aria-invalid={startDay == null}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Start one day later"
                disabled={disabled || (startDay ?? 1) >= 28}
                onClick={() => stepDay(1)}
              >
                +
              </Button>
            </Inline>
          </FormField>
          <Text variant="caption" color="secondary" role="status">
            {thisCycle
              ? `This month's salary: ${formatDateRange(thisCycle.from, thisCycle.to)}`
              : 'Enter a day from 1 to 28.'}
          </Text>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {readOnly ? null : (
            <Inline gap="sm" justify="end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(draftFrom(settings));
                  setError(null);
                }}
                disabled={save.isPending}
              >
                Undo changes
              </Button>
              <Button type="button" variant="solid" onClick={handleSave} loading={save.isPending}>
                Save working rules
              </Button>
            </Inline>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}
