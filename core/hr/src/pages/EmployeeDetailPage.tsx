import { useState } from 'react';
import { useParams } from 'react-router';
import {
  Alert,
  Badge,
  CenteredLoader,
  Inline,
  Stack,
  Tabs,
  Text,
} from '@inventory-platform/ui-kit';
import { EMPLOYEE_STATUS_LABELS } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useEmployeeQuery } from '../queries/hooks';
import { EmployeeAdvancesTab } from '../ui/EmployeeAdvancesTab';
import { EmployeeAttendanceTab } from '../ui/EmployeeAttendanceTab';
import { EmployeeLeaveTab } from '../ui/EmployeeLeaveTab';
import { EmployeePayslipsTab } from '../ui/EmployeePayslipsTab';
import { EmployeeProfileTab } from '../ui/EmployeeProfileTab';
import { EmployeeSalaryTab } from '../ui/EmployeeSalaryTab';
import { EMPLOYEES_PATH } from '../ui/EmployeeNameLink';
import { HrBackLink } from '../ui/HrBackLink';
import { HrInbox } from '../ui/HrInbox';

export function EmployeeDetailPage() {
  const { employeeId } = useParams();
  const { can } = useHrAccess();
  const canView = can('VIEW_EMPLOYEES');
  const employee = useEmployeeQuery(canView ? employeeId : undefined);
  const [tab, setTab] = useState('profile');

  const back = <HrBackLink to={EMPLOYEES_PATH} label="All employees" />;

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see employees in this shop.</Alert>
      </Stack>
    );
  }
  if (employee.isLoading) return <CenteredLoader label="Loading employee…" />;
  if (employee.error || !employee.data) {
    return (
      <Stack gap="md">
        {back}
        <Alert variant="danger">{employee.error?.message ?? 'Employee not found'}</Alert>
      </Stack>
    );
  }

  const e = employee.data;
  // Salary UI only for VIEW_SALARIES, and never when the server withheld pay (R4.13).
  const showSalary = can('VIEW_SALARIES') && !e.payHidden;
  const items = [
    { value: 'profile', label: 'Profile', panel: <EmployeeProfileTab employee={e} /> },
    ...(showSalary
      ? [{ value: 'salary', label: 'Salary', panel: <EmployeeSalaryTab employee={e} /> }]
      : []),
    // Attendance and leave need VIEW_ATTENDANCE (the API answers 403 otherwise).
    ...(can('VIEW_ATTENDANCE')
      ? [
          {
            value: 'attendance',
            label: 'Attendance',
            panel: <EmployeeAttendanceTab employee={e} />,
          },
          { value: 'leave', label: 'Leave', panel: <EmployeeLeaveTab employee={e} /> },
        ]
      : []),
    // Advances need VIEW_SALARIES (amounts) and MANAGE_ADVANCES (every advances endpoint).
    ...(can('VIEW_SALARIES') && can('MANAGE_ADVANCES')
      ? [{ value: 'advances', label: 'Advances', panel: <EmployeeAdvancesTab employee={e} /> }]
      : []),
    // Payslips need VIEW_SALARIES (the PDF) and payroll access (finding the month's run).
    ...(showSalary && (can('RUN_PAYROLL') || can('RECORD_PAYMENTS'))
      ? [{ value: 'payslips', label: 'Payslips', panel: <EmployeePayslipsTab employee={e} /> }]
      : []),
  ];

  return (
    <Stack gap="md">
      {back}
      <Inline gap="sm" flexWrap justify="between">
        <Inline gap="sm" flexWrap>
          <Text variant="heading3" as="h2">
            {e.name}
          </Text>
          <Text color="secondary">{e.code}</Text>
          <Badge variant={e.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {EMPLOYEE_STATUS_LABELS[e.status]}
          </Badge>
        </Inline>
        <HrInbox />
      </Inline>
      <Tabs
        value={items.some((i) => i.value === tab) ? tab : 'profile'}
        onChange={setTab}
        items={items}
      />
    </Stack>
  );
}
