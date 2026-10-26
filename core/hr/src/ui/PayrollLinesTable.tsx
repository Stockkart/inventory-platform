import {
  Badge,
  Button,
  DenseTable,
  DenseTableCell,
  DenseTableHeaderCell,
  DenseTableRow,
  DenseTableSurface,
  Inline,
  TableBody,
  TableHead,
  Text,
  LinkButton,
} from '@inventory-platform/ui-kit';
import {
  PAYROLL_WARNING_LABELS,
  formatInr,
  formatMonth,
  isLinePending,
  lineAdvanceRecovered,
  lineOtherDeductions,
  paymentStatusText,
  type PayrollLineResponse,
} from '@inventory-platform/hr/types';

/** 1 → "1", 27.5 → "27.5"; null → "—". */
export function formatCount(n: number | null | undefined): string {
  if (n == null) return '—';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export interface PayrollLinesTableProps {
  period: string;
  lines: readonly PayrollLineResponse[];
  /** Payment column only once the run is finalised (drafts are never paid). */
  showPayment: boolean;
  onOpen: (line: PayrollLineResponse) => void;
  /** Run F5: FINALISED and RECORD_PAYMENTS — "Mark paid" / "Undo payment" per line. */
  canPay?: boolean;
  /** Run F5: FINALISED and VIEW_SALARIES — a payslip button per line. */
  canPayslip?: boolean;
  onMarkPaid?: (line: PayrollLineResponse) => void;
  onUndoPayment?: (line: PayrollLineResponse) => void;
  onPayslip?: (line: PayrollLineResponse) => void;
  /** Line whose payslip is downloading. */
  payslipPendingId?: string | null;
}

/** One row per employee; the name opens the full breakdown. Warnings are plain text badges. */
export function PayrollLinesTable({
  period,
  lines,
  showPayment,
  onOpen,
  canPay = false,
  canPayslip = false,
  onMarkPaid,
  onUndoPayment,
  onPayslip,
  payslipPendingId = null,
}: PayrollLinesTableProps) {
  const showPayslip = showPayment && canPayslip;
  const cols = 9 + (showPayment ? 1 : 0) + (showPayslip ? 1 : 0);
  return (
    <DenseTable>
      <DenseTableSurface aria-label={`Pay for ${formatMonth(period)}`}>
        <TableHead>
          <DenseTableRow>
            <DenseTableHeaderCell scope="col">Code</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Name</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Paid days</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Gross</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Deductions</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Advance recovered</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Rounding</DenseTableHeaderCell>
            <DenseTableHeaderCell scope="col">Net pay</DenseTableHeaderCell>
            {showPayment ? <DenseTableHeaderCell scope="col">Payment</DenseTableHeaderCell> : null}
            {showPayslip ? <DenseTableHeaderCell scope="col">Payslip</DenseTableHeaderCell> : null}
            <DenseTableHeaderCell scope="col">Check</DenseTableHeaderCell>
          </DenseTableRow>
        </TableHead>
        <TableBody>
          {lines.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell colSpan={cols}>
                <Text color="muted">Nobody was employed in this month.</Text>
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            lines.map((l) => {
              const name = l.employeeSnapshot?.name ?? 'Employee';
              const payment = l.paymentStatus ?? 'PENDING';
              return (
                <DenseTableRow key={l.id}>
                  <DenseTableCell>{l.employeeSnapshot?.code ?? '—'}</DenseTableCell>
                  <DenseTableCell>
                    <LinkButton
                      aria-label={`Show pay details for ${name}`}
                      onClick={() => onOpen(l)}
                    >
                      {name}
                    </LinkButton>
                  </DenseTableCell>
                  <DenseTableCell>{formatCount(l.dayCounts?.paidDays)}</DenseTableCell>
                  <DenseTableCell>{formatInr(l.gross)}</DenseTableCell>
                  <DenseTableCell>{formatInr(lineOtherDeductions(l))}</DenseTableCell>
                  <DenseTableCell>{formatInr(lineAdvanceRecovered(l))}</DenseTableCell>
                  <DenseTableCell>{formatInr(l.rounding)}</DenseTableCell>
                  <DenseTableCell>
                    <Text as="span" weight="semibold">
                      {formatInr(l.net)}
                    </Text>
                  </DenseTableCell>
                  {showPayment ? (
                    <DenseTableCell>
                      <Inline gap="xs" flexWrap>
                        {/* "Pending" / "Paid on 9 Oct 2026 by Cash" / "Being paid". */}
                        <Badge variant={payment === 'PAID' ? 'success' : 'neutral'}>
                          {paymentStatusText(l)}
                        </Badge>
                        {canPay && isLinePending(l) && onMarkPaid ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Mark ${name} as paid`}
                            onClick={() => onMarkPaid(l)}
                          >
                            Mark paid
                          </Button>
                        ) : null}
                        {canPay && payment === 'PAID' && onUndoPayment ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Undo payment to ${name}`}
                            onClick={() => onUndoPayment(l)}
                          >
                            Undo payment
                          </Button>
                        ) : null}
                      </Inline>
                    </DenseTableCell>
                  ) : null}
                  {showPayslip ? (
                    <DenseTableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Download payslip for ${name}`}
                        loading={payslipPendingId === l.id}
                        onClick={() => onPayslip?.(l)}
                      >
                        Payslip
                      </Button>
                    </DenseTableCell>
                  ) : null}
                  <DenseTableCell>
                    {(l.warnings ?? []).length === 0 ? (
                      '—'
                    ) : (
                      <Inline gap="xs" flexWrap>
                        {(l.warnings ?? []).map((w) => (
                          <Badge key={w} variant="warning">
                            {PAYROLL_WARNING_LABELS[w] ?? 'Check this line'}
                          </Badge>
                        ))}
                      </Inline>
                    )}
                  </DenseTableCell>
                </DenseTableRow>
              );
            })
          )}
        </TableBody>
      </DenseTableSurface>
    </DenseTable>
  );
}
