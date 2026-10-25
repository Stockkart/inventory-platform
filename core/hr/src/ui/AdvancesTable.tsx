import {
  Badge,
  Button,
  Inline,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import {
  ADVANCE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDate,
  formatInr,
  type AdvanceResponse,
} from '@inventory-platform/hr/types';

export interface AdvancesTableProps {
  advances: readonly AdvanceResponse[];
  loading?: boolean;
  /** Hide the employee column (employee detail page). */
  hideEmployee?: boolean;
  /** Opens the employee's statement; left out = no Statement button. */
  onStatement?: (advance: AdvanceResponse) => void;
  onCancel: (advance: AdvanceResponse) => void;
}

/** An advance can be cancelled only while active and nothing of it was recovered (R7, B3). */
export function canCancelAdvance(a: AdvanceResponse): boolean {
  return a.status === 'ACTIVE' && a.recovered <= 0;
}

/** Advances with what was recovered and what is still owed (R7.2). */
export function AdvancesTable({
  advances,
  loading,
  hideEmployee = false,
  onStatement,
  onCancel,
}: AdvancesTableProps) {
  const cols = 8 + (hideEmployee ? 0 : 1);
  return (
    <Table aria-label="Advances">
      <TableHead>
        <TableRow>
          {hideEmployee ? null : <TableHeaderCell>Employee</TableHeaderCell>}
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
          <TableHeaderCell>Monthly cut</TableHeaderCell>
          <TableHeaderCell>Recovered</TableHeaderCell>
          <TableHeaderCell>Still owed</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Note</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableLoadingRow colSpan={cols} />
        ) : advances.length === 0 ? (
          <TableEmptyRow colSpan={cols} message="No advances given yet" />
        ) : (
          advances.map((a) => {
            const who = a.employeeName ?? a.employeeCode ?? 'Employee';
            const repaid = a.status === 'ACTIVE' && a.outstanding <= 0;
            return (
              <TableRow key={a.id}>
                {hideEmployee ? null : (
                  <TableCell>
                    <Text as="span">{who}</Text>{' '}
                    {a.employeeCode ? (
                      <Text as="span" variant="caption" color="muted">
                        {a.employeeCode}
                      </Text>
                    ) : null}
                  </TableCell>
                )}
                <TableCell>{formatDate(a.date)}</TableCell>
                <TableCell>
                  {formatInr(a.amount)}
                  <Text variant="caption" color="muted">
                    {PAYMENT_METHOD_LABELS[a.paidBy]}
                  </Text>
                </TableCell>
                <TableCell>{formatInr(a.monthlyDeduction)}</TableCell>
                <TableCell>{formatInr(a.recovered)}</TableCell>
                <TableCell>{a.status === 'CANCELLED' ? '—' : formatInr(a.outstanding)}</TableCell>
                <TableCell>
                  <Badge
                    variant={a.status === 'CANCELLED' ? 'neutral' : repaid ? 'success' : 'info'}
                  >
                    {repaid ? 'Repaid' : ADVANCE_STATUS_LABELS[a.status]}
                  </Badge>
                  {/* Server retries a failed accounts entry on the next call; just say so. */}
                  {!a.journalPosted && a.status === 'ACTIVE' ? (
                    <Text variant="caption" color="muted">
                      Accounts entry pending
                    </Text>
                  ) : null}
                </TableCell>
                <TableCell>{a.note || '—'}</TableCell>
                <TableCell>
                  <Inline gap="xs" flexWrap>
                    {onStatement ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Show advance statement for ${who}`}
                        onClick={() => onStatement(a)}
                      >
                        Statement
                      </Button>
                    ) : null}
                    {/* Hidden, not disabled: once anything is recovered the server refuses. */}
                    {canCancelAdvance(a) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Cancel advance of ${formatInr(a.amount)} for ${who}`}
                        onClick={() => onCancel(a)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </Inline>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
