import { useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  EditModal,
  FormField,
  Inline,
  Input,
  MonthPicker,
  SegmentedControl,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  PAY_TYPE_LABELS,
  currentMonth,
  formatInr,
  formatMonth,
  formatPay,
  salaryAmountError,
  type EmployeeResponse,
  type PayType,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useAddSalaryRevisionMutation } from '../queries/hooks';

const PAY_TYPE_OPTIONS = (Object.keys(PAY_TYPE_LABELS) as PayType[]).map((value) => ({
  value,
  label: PAY_TYPE_LABELS[value],
}));

export interface EmployeeSalaryTabProps {
  employee: EmployeeResponse;
}

/**
 * Salary tab (R4.12): history of pay changes and "Change salary from month". Only rendered for
 * VIEW_SALARIES users on an employee whose pay was not withheld (the page checks both).
 */
export function EmployeeSalaryTab({ employee }: EmployeeSalaryTabProps) {
  const { can } = useHrAccess();
  const canChange = can('ADD_EDIT_EMPLOYEES') && employee.status === 'ACTIVE';
  const add = useAddSalaryRevisionMutation();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [payType, setPayType] = useState<PayType>(employee.payType ?? 'MONTHLY');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Newest first; YYYY-MM strings sort as dates.
  const revisions = [...(employee.salaryRevisions ?? [])].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  );
  const replacing = revisions.some((r) => r.effectiveFrom === month);

  const handleSave = () => {
    const problem = salaryAmountError(amount);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    add.mutate(
      { id: employee.id, body: { effectiveFrom: month, payType, amount: Number(amount) } },
      {
        onSuccess: () => {
          useNotify.success(`New pay applies from ${formatMonth(month)}`);
          setOpen(false);
        },
        onError: (err) => setError(err.message || 'Could not change the salary'),
      },
    );
  };

  return (
    <Stack gap="md">
      <Card>
        <CardBody>
          <Stack gap="md">
            <Inline gap="sm" justify="between" flexWrap>
              <Stack gap="xs">
                <Text variant="heading4" as="h3">
                  Pay
                </Text>
                <Text>This month: {formatPay(employee.payType, employee.salaryAmount)}</Text>
              </Stack>
              {canChange ? (
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => {
                    setMonth(currentMonth());
                    setPayType(employee.payType ?? 'MONTHLY');
                    setAmount('');
                    setError(null);
                    setOpen(true);
                  }}
                >
                  Change salary from month
                </Button>
              ) : null}
            </Inline>

            <Table aria-label="Salary history">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>From</TableHeaderCell>
                  <TableHeaderCell>Pay type</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revisions.length === 0 ? (
                  <TableEmptyRow colSpan={3} message="No pay set yet" />
                ) : (
                  revisions.map((r) => (
                    <TableRow key={r.effectiveFrom}>
                      <TableCell>{formatMonth(r.effectiveFrom)}</TableCell>
                      <TableCell>{r.payType ? PAY_TYPE_LABELS[r.payType] : '—'}</TableCell>
                      <TableCell>{formatInr(r.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>

      <EditModal
        open={open}
        title="Change salary"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onSave={handleSave}
        saving={add.isPending}
        error={error}
        saveLabel="Save new pay"
      >
        <Stack gap="sm">
          <MonthPicker label="New pay starts in" value={month} onChange={setMonth} />
          <Text variant="caption" color="muted">
            {replacing
              ? `This replaces the pay already set from ${formatMonth(month)}.`
              : `Months before ${formatMonth(month)} keep the old pay.`}
          </Text>
          <SegmentedControl
            aria-label="Pay type"
            value={payType}
            options={PAY_TYPE_OPTIONS}
            onChange={setPayType}
          />
          <FormField
            label={payType === 'DAILY' ? 'Wage per day (₹)' : 'Salary per month (₹)'}
            id="hr-salary-revision-amount"
          >
            <Input
              id="hr-salary-revision-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
        </Stack>
      </EditModal>
    </Stack>
  );
}
