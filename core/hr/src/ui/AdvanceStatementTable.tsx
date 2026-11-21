import {
  Alert,
  Stack,
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
  formatDate,
  formatInr,
  formatMonth,
  type AdvanceStatementRow,
} from '@inventory-platform/hr/types';
import { useAdvanceStatementQuery } from '../queries/hooks';

function describeRow(r: AdvanceStatementRow): string {
  if (r.kind === 'RECOVERED') return `Taken from ${formatMonth(r.period)} pay`;
  return r.cancelled ? 'Advance given (cancelled, not counted)' : 'Advance given';
}

export interface AdvanceStatementTableProps {
  employeeId: string;
}

/**
 * Advance statement of one employee (R7.5): advances given and amounts taken from finalised
 * pay, oldest first, with the balance still owed after each row.
 */
export function AdvanceStatementTable({ employeeId }: AdvanceStatementTableProps) {
  const statement = useAdvanceStatementQuery(employeeId);
  const rows = statement.data?.rows ?? [];

  return (
    <Stack gap="sm">
      {statement.error ? <Alert variant="danger">{statement.error.message}</Alert> : null}
      <Table aria-label="Advance statement">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>What happened</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Still owed</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {statement.isLoading ? (
            <TableLoadingRow colSpan={4} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={4} message="No advances for this employee" />
          ) : (
            rows.map((r, i) => (
              <TableRow key={`${r.advanceId}-${r.kind}-${r.period ?? ''}-${i}`}>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell>{describeRow(r)}</TableCell>
                <TableCell>
                  {/* Given adds to what is owed, recovered takes from it. */}
                  {r.kind === 'RECOVERED' ? '− ' : '+ '}
                  {formatInr(r.amount)}
                </TableCell>
                <TableCell>{formatInr(r.balance)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {statement.data ? (
        <Text weight="semibold">Still owed now: {formatInr(statement.data.outstanding)}</Text>
      ) : null}
    </Stack>
  );
}
