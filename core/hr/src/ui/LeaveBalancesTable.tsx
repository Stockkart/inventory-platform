import {
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
import { formatDays, type LeaveBalanceRow } from '@inventory-platform/hr/types';
import { EmployeeNameLink } from './EmployeeNameLink';

export interface LeaveBalancesTableProps {
  rows: readonly LeaveBalanceRow[];
  loading?: boolean;
  /** Hide the employee column (employee detail page). */
  hideEmployee?: boolean;
}

/** One line per employee × leave type: quota (prorated in the first year), used, available. */
export function LeaveBalancesTable({
  rows,
  loading,
  hideEmployee = false,
}: LeaveBalancesTableProps) {
  const cols = hideEmployee ? 4 : 5;
  const lines = rows.flatMap((row) =>
    row.balances.map((b, i) => ({
      row,
      b,
      first: i === 0,
      key: `${row.employeeId}|${b.leaveTypeId}`,
    })),
  );
  return (
    <Table aria-label="Leave balances">
      <TableHead>
        <TableRow>
          {hideEmployee ? null : <TableHeaderCell>Employee</TableHeaderCell>}
          <TableHeaderCell>Leave type</TableHeaderCell>
          <TableHeaderCell>Quota</TableHeaderCell>
          <TableHeaderCell>Used</TableHeaderCell>
          <TableHeaderCell>Available</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableLoadingRow colSpan={cols} />
        ) : lines.length === 0 ? (
          <TableEmptyRow colSpan={cols} message="No balances for this year" />
        ) : (
          lines.map(({ row, b, first, key }) => (
            <TableRow key={key}>
              {hideEmployee ? null : (
                <TableCell>
                  {/* Name once per employee keeps long lists readable. */}
                  {first ? (
                    <EmployeeNameLink employeeId={row.employeeId} name={row.name} code={row.code} />
                  ) : null}
                </TableCell>
              )}
              <TableCell>
                {b.leaveTypeName}{' '}
                <Text as="span" variant="caption" color="muted">
                  {b.paid ? 'Paid' : 'Unpaid'}
                </Text>
              </TableCell>
              <TableCell>{formatDays(b.quota)}</TableCell>
              <TableCell>{formatDays(b.used)}</TableCell>
              <TableCell>{formatDays(b.available)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
