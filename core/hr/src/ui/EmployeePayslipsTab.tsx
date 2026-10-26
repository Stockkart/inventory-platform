import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
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
import { formatMonth, type EmployeeResponse } from '@inventory-platform/hr/types';
import { deliverHrFile } from '../api/download';
import { payrollApi } from '../api/payroll.api';
import { hrKeys } from '../queries/keys';
import { useHrDownload, useHrShopId, usePayrollRunsQuery } from '../queries/hooks';
import { HrDownloadAlert } from './HrDownloadAlert';

export interface EmployeePayslipsTabProps {
  employee: EmployeeResponse;
}

/**
 * One employee's payslips (R10.1–R10.3) for staff with VIEW_SALARIES and payroll access: one row
 * per finalised month inside their employment. There is no per-employee payslip list in the API,
 * so the month's run is read when the button is pressed (cached) to find this employee's line.
 */
export function EmployeePayslipsTab({ employee }: EmployeePayslipsTabProps) {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  const runs = usePayrollRunsQuery();
  const download = useHrDownload();

  const joinMonth = employee.joinDate?.slice(0, 7) ?? null;
  const exitMonth = employee.exitDate?.slice(0, 7) ?? null;
  // YYYY-MM strings compare in month order.
  const months = (runs.data ?? [])
    .filter((r) => r.status === 'FINALISED')
    .filter((r) => (!joinMonth || r.period >= joinMonth) && (!exitMonth || r.period <= exitMonth))
    .sort((a, b) => (a.period < b.period ? 1 : -1));

  const get = (runId: string, period: string) =>
    void download.run(`payslip:${runId}`, async () => {
      const run = await queryClient.fetchQuery({
        queryKey: hrKeys.payrollRun(shopId, runId),
        queryFn: () => payrollApi.get(runId),
      });
      const line = (run.lines ?? []).find((l) => l.employeeId === employee.id);
      if (!line) {
        throw new Error(`${employee.name} has no payslip for ${formatMonth(period)}.`);
      }
      deliverHrFile(await payrollApi.payslipPdf(runId, line.id), 'pdf');
    });

  return (
    <>
      <HrDownloadAlert download={download} />
      {runs.error ? <Alert variant="danger">{runs.error.message}</Alert> : null}
      <Table aria-label={`Payslips of ${employee.name}`}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Month</TableHeaderCell>
            <TableHeaderCell>Payslip</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.isLoading ? (
            <TableLoadingRow colSpan={2} />
          ) : months.length === 0 ? (
            <TableEmptyRow colSpan={2} message="No finalised payroll for this employee yet" />
          ) : (
            months.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Text as="span">{formatMonth(r.period)}</Text>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={download.pending === `payslip:${r.id}`}
                    aria-label={`Download payslip for ${formatMonth(r.period)}`}
                    onClick={() => get(r.id, r.period)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
