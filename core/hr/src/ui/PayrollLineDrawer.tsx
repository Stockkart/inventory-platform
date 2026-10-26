import { useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormField,
  IconButton,
  Inline,
  Input,
  SegmentedControl,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  MANUAL_ITEM_KIND_LABELS,
  MAX_PAYROLL_MANUAL_ITEMS,
  MAX_PAYROLL_NOTE_LENGTH,
  PAYROLL_WARNING_LABELS,
  adjustmentsDraftFromLine,
  adjustmentsToRequest,
  formatDate,
  formatDateRange,
  salaryRange,
  formatDays,
  formatInr,
  formatMinutes,
  formatPay,
  hasAdjustmentErrors,
  isLinePending,
  lineAdvanceRecovered,
  paymentStatusText,
  validateAdjustments,
  type AdjustmentsDraft,
  type AdjustmentsErrors,
  type ManualItemKind,
  type PayrollDayCounts,
  type PayrollLineResponse,
} from '@inventory-platform/hr/types';
import { useSavePayrollAdjustmentsMutation } from '../queries/hooks';
import { EmploymentChangeBadges, formatCount } from './PayrollLinesTable';

const KIND_OPTIONS = (['BONUS', 'OTHER_DEDUCTION'] as ManualItemKind[]).map((value) => ({
  value,
  label: MANUAL_ITEM_KIND_LABELS[value],
}));

/** Day counts in the order a shop owner reads them; null rows are left out. */
const DAY_ROWS: Array<[keyof PayrollDayCounts, string]> = [
  ['employedDays', 'Days employed this month'],
  ['present', 'Present'],
  ['halfDays', 'Half-days'],
  ['paidLeave', 'Paid leave'],
  ['unpaidLeave', 'Unpaid leave'],
  ['absent', 'Absent'],
  ['weekOff', 'Week-offs'],
  ['holiday', 'Holidays'],
  ['offDayWorked', 'Work on off days'],
  ['unmarked', 'Not marked yet'],
  ['paidDays', 'Paid days'],
  ['basisDays', 'Days the monthly pay is divided by'],
];

function AmountRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <Inline justify="between" gap="sm">
      <Text weight={strong ? 'semibold' : undefined}>{label}</Text>
      <Text weight={strong ? 'semibold' : undefined}>{formatInr(amount)}</Text>
    </Inline>
  );
}

interface AdjustmentsEditorProps {
  runId: string;
  line: PayrollLineResponse;
}

/**
 * Manual items (bonus or incentive, other deduction; each with a note) and this month's advance
 * deduction (R7.4, R8.9). Saving replaces all manual items; the server refuses a net below zero.
 */
function AdjustmentsEditor({ runId, line }: AdjustmentsEditorProps) {
  const save = useSavePayrollAdjustmentsMutation();
  const [draft, setDraft] = useState<AdjustmentsDraft>(() => adjustmentsDraftFromLine(line));
  const [errors, setErrors] = useState<AdjustmentsErrors>({ items: {} });
  const [error, setError] = useState<string | null>(null);
  // Offer the advance box only when there is something to recover (or an override to undo).
  const hasAdvance =
    (line.advanceRecoveries ?? []).length > 0 ||
    line.advanceOutstandingAfter != null ||
    line.advanceOverride != null;

  const setItem = (i: number, patch: Partial<AdjustmentsDraft['items'][number]>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((item, j) => (j === i ? { ...item, ...patch } : item)),
    }));

  const handleSave = () => {
    const found = validateAdjustments(draft);
    setErrors(found);
    setError(null);
    if (hasAdjustmentErrors(found)) return;
    save.mutate(
      { runId, lineId: line.id, body: adjustmentsToRequest(draft) },
      {
        onSuccess: () => useNotify.success('Pay changes saved'),
        // e.g. "The deductions are more than this employee's pay for the month".
        onError: (err) => setError(err.message || 'Could not save the changes'),
      },
    );
  };

  return (
    <Stack gap="sm">
      <Text variant="heading4" as="h3">
        Changes for this month
      </Text>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {errors.form ? <Alert variant="danger">{errors.form}</Alert> : null}
      {draft.items.length === 0 ? (
        <Text color="muted">No bonus or extra deduction added.</Text>
      ) : null}
      {draft.items.map((item, i) => {
        const n = i + 1;
        const e = errors.items[i] ?? {};
        return (
          <Stack key={i} gap="xs" aria-label={`Extra item ${n}`} role="group">
            <Inline justify="between" gap="sm">
              <SegmentedControl<ManualItemKind>
                aria-label={`Kind of item ${n}`}
                options={KIND_OPTIONS}
                value={item.kind}
                onChange={(v) => setItem(i, { kind: v })}
                disabled={save.isPending}
              />
              <IconButton
                label={`Remove item ${n}`}
                onClick={() =>
                  setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))
                }
                disabled={save.isPending}
              >
                ×
              </IconButton>
            </Inline>
            <FormField label={`Note for item ${n}`} id={`hr-line-item-note-${i}`} error={e.note}>
              <Input
                id={`hr-line-item-note-${i}`}
                value={item.note}
                maxLength={MAX_PAYROLL_NOTE_LENGTH}
                placeholder={item.kind === 'BONUS' ? 'e.g. Diwali bonus' : 'e.g. Broken glass'}
                onChange={(ev) => setItem(i, { note: ev.target.value })}
                disabled={save.isPending}
              />
            </FormField>
            <FormField
              label={`Amount for item ${n} (₹)`}
              id={`hr-line-item-amount-${i}`}
              error={e.amount}
            >
              <Input
                id={`hr-line-item-amount-${i}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={item.amount}
                onChange={(ev) => setItem(i, { amount: ev.target.value })}
                disabled={save.isPending}
              />
            </FormField>
          </Stack>
        );
      })}
      {draft.items.length < MAX_PAYROLL_MANUAL_ITEMS ? (
        <Box>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                items: [...d.items, { kind: 'BONUS', note: '', amount: '' }],
              }))
            }
            disabled={save.isPending}
          >
            Add bonus or deduction
          </Button>
        </Box>
      ) : null}

      {hasAdvance ? (
        <Stack gap="xs">
          <Checkbox
            label="Change this month's advance deduction"
            checked={draft.overrideAdvance}
            onChange={(ev) => setDraft((d) => ({ ...d, overrideAdvance: ev.target.checked }))}
            disabled={save.isPending}
          />
          {draft.overrideAdvance ? (
            <FormField
              label="Advance deduction this month (₹)"
              id="hr-line-advance-override"
              hint="0 takes nothing this month. It is never more than what is still owed or the pay."
              error={errors.advanceOverride}
            >
              <Input
                id="hr-line-advance-override"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={draft.advanceOverride}
                onChange={(ev) => setDraft((d) => ({ ...d, advanceOverride: ev.target.value }))}
                disabled={save.isPending}
              />
            </FormField>
          ) : null}
        </Stack>
      ) : null}

      <Inline gap="sm">
        <Button type="button" variant="solid" loading={save.isPending} onClick={handleSave}>
          Save changes
        </Button>
      </Inline>
    </Stack>
  );
}

export interface PayrollLineDrawerProps {
  runId: string;
  /** null = closed. */
  line: PayrollLineResponse | null;
  /** Draft run and RUN_PAYROLL: show the changes editor. */
  canEdit: boolean;
  onClose: () => void;
  /** Run F5: FINALISED and RECORD_PAYMENTS. */
  canPay?: boolean;
  /** Run F5: FINALISED and VIEW_SALARIES. */
  canPayslip?: boolean;
  onMarkPaid?: (line: PayrollLineResponse) => void;
  onUndoPayment?: (line: PayrollLineResponse) => void;
  onPayslip?: (line: PayrollLineResponse) => void;
  payslipPending?: boolean;
}

/** Full pay breakdown of one employee for the month (R8.3–R8.10, R8.15). */
export function PayrollLineDrawer({
  runId,
  line,
  canEdit,
  onClose,
  canPay = false,
  canPayslip = false,
  onMarkPaid,
  onUndoPayment,
  onPayslip,
  payslipPending = false,
}: PayrollLineDrawerProps) {
  const titleId = useId();
  const snap = line?.employeeSnapshot;
  const counts = line?.dayCounts ?? {};
  const advance = line ? lineAdvanceRecovered(line) : 0;
  const payment = line?.paymentStatus ?? 'PENDING';
  // Old lines without dates: the calendar month of the period.
  const range = line ? salaryRange(line) : null;

  return (
    <Drawer open={line != null} onClose={onClose} side="right" labelledBy={titleId}>
      {line ? (
        <Box className={hrChrome.hrDayDrawer}>
          <Inline justify="between" align="start" gap="sm">
            <Stack gap="xs">
              <Inline gap="xs" align="center" flexWrap>
                <Text variant="heading4" as="h2" id={titleId}>
                  {snap?.name ?? 'Employee'}
                </Text>
                <EmploymentChangeBadges line={line} />
              </Inline>
              <Text color="secondary">
                {[snap?.code, snap?.designation].filter(Boolean).join(' · ')}
              </Text>
              <Text color="secondary">{formatPay(snap?.payType, snap?.rateAmount)}</Text>
            </Stack>
            <IconButton label="Close pay details" onClick={onClose}>
              ×
            </IconButton>
          </Inline>

          {(line.warnings ?? []).map((w) => (
            <Alert key={w} variant="warning">
              {w === 'NO_SALARY'
                ? 'No salary is set for this month, so pay is zero. Add the salary on the employee page, then recalculate.'
                : w === 'DEDUCTIONS_EXCEED_PAY'
                ? 'Deductions are more than the pay. Lower them before finalising.'
                : PAYROLL_WARNING_LABELS[w] ?? 'Check this line'}
            </Alert>
          ))}

          <Stack gap="xs" as="section" aria-label="Days">
            <Text variant="heading4" as="h3">
              Days
            </Text>
            {range ? (
              <Text color="secondary">Salary period {formatDateRange(range.from, range.to)}</Text>
            ) : null}
            {/* Counting starts at the join date (old records without one: the creation date). */}
            {snap?.joinDate ? (
              <Text color="secondary">
                Joined {formatDate(snap.joinDate)}
                {snap.exitDate ? ` · Left ${formatDate(snap.exitDate)}` : ''}
              </Text>
            ) : snap?.exitDate ? (
              <Text color="secondary">Left {formatDate(snap.exitDate)}</Text>
            ) : null}
            {DAY_ROWS.filter(([key]) => counts[key] != null).map(([key, label]) => (
              <Inline key={key} justify="between" gap="sm">
                <Text>{label}</Text>
                {/* Off-day work comes in halves (run B5), so it reads "1.5 days". */}
                <Text>
                  {key === 'offDayWorked' ? formatDays(counts[key]) : formatCount(counts[key])}
                </Text>
              </Inline>
            ))}
            {line.overtimeMinutes ? (
              <Inline justify="between" gap="sm">
                <Text>Overtime</Text>
                <Text>{formatMinutes(line.overtimeMinutes)}</Text>
              </Inline>
            ) : null}
          </Stack>

          <Divider />
          <Stack gap="xs" as="section" aria-label="Earnings">
            <Text variant="heading4" as="h3">
              Earnings
            </Text>
            {(line.earnings ?? []).map((e, i) => (
              <AmountRow key={`${e.kind}-${i}`} label={e.label} amount={e.amount} />
            ))}
            <AmountRow label="Gross pay" amount={line.gross} strong />
          </Stack>

          <Stack gap="xs" as="section" aria-label="Deductions">
            <Text variant="heading4" as="h3">
              Deductions
            </Text>
            {(line.deductions ?? []).length === 0 ? <Text color="muted">None</Text> : null}
            {(line.deductions ?? []).map((d, i) => (
              <AmountRow key={`${d.kind}-${i}`} label={d.label} amount={d.amount} />
            ))}
            {advance > 0 || line.advanceOutstandingAfter != null ? (
              <Text variant="caption" color="muted">
                Advance recovered this month: {formatInr(advance)}
                {line.advanceOverride != null ? ' (changed by hand)' : ''}
                {line.advanceOutstandingAfter != null
                  ? `. Still owed after this month: ${formatInr(line.advanceOutstandingAfter)}`
                  : ''}
              </Text>
            ) : null}
            <AmountRow label="Total deductions" amount={line.totalDeductions} strong />
          </Stack>

          <Divider />
          <Stack gap="xs" as="section" aria-label="Net pay">
            <AmountRow label="Pay before rounding" amount={line.netBeforeRounding} />
            {/* Net is rounded to the rupee; the difference is its own line (R8.15). */}
            <AmountRow label="Rounding" amount={line.rounding} />
            <AmountRow label="Net pay" amount={line.net} strong />
          </Stack>

          {line.frozen ? (
            <Stack gap="xs" as="section" aria-label="Payment">
              <Text variant="heading4" as="h3">
                Payment
              </Text>
              <Text>
                {paymentStatusText(line)}
                {payment === 'PAID' && line.paymentReference ? ` (${line.paymentReference})` : ''}
              </Text>
              <Inline gap="sm" flexWrap>
                {canPay && isLinePending(line) && onMarkPaid ? (
                  <Button type="button" variant="solid" size="sm" onClick={() => onMarkPaid(line)}>
                    Mark paid
                  </Button>
                ) : null}
                {canPay && payment === 'PAID' && onUndoPayment ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onUndoPayment(line)}
                  >
                    Undo payment
                  </Button>
                ) : null}
                {canPayslip && onPayslip ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={payslipPending}
                    onClick={() => onPayslip(line)}
                  >
                    Download payslip
                  </Button>
                ) : null}
              </Inline>
            </Stack>
          ) : null}

          {canEdit && !line.frozen ? (
            <>
              <Divider />
              {/* Keyed on the server's updatedAt: a saved or recalculated line resets the
                  editor, while a background refetch of the same line keeps unsaved typing. */}
              <AdjustmentsEditor
                key={`${line.id}:${line.updatedAt ?? ''}`}
                runId={runId}
                line={line}
              />
            </>
          ) : null}
        </Box>
      ) : null}
    </Drawer>
  );
}
