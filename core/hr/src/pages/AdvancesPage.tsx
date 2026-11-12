import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  PageHeader,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import type { AdvanceResponse } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { HrInbox } from '../ui/HrInbox';
import { useAdvancesQuery, useEmployeeOptionsQuery } from '../queries/hooks';
import { AdvanceStatementDrawer } from '../ui/AdvanceStatementDrawer';
import { AdvancesTable } from '../ui/AdvancesTable';
import { CancelAdvanceModal } from '../ui/CancelAdvanceModal';
import { EmployeePicker, type EmployeePickerOption } from '../ui/EmployeePicker';
import { GiveAdvanceModal } from '../ui/GiveAdvanceModal';

/**
 * Advances (R7.1, R7.2, R7.5): money given to staff ahead of salary, recovered a fixed amount a
 * month from finalised payroll. List (filter by employee), give, cancel (only while nothing was
 * recovered) and a statement per employee.
 */
export function AdvancesPage() {
  const { can } = useHrAccess();
  const allowed = can('MANAGE_ADVANCES');
  // '' = everyone (the server returns the shop's newest 500).
  const [employeeId, setEmployeeId] = useState('');
  const [giveOpen, setGiveOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdvanceResponse | null>(null);
  const [statementFor, setStatementFor] = useState<{
    employeeId: string;
    name: string;
    code?: string | null;
  } | null>(null);

  const advances = useAdvancesQuery(employeeId || null, allowed);
  // MANAGE_ADVANCES always comes with VIEW_EMPLOYEES (backend closure), so this list is allowed.
  const employees = useEmployeeOptionsQuery(allowed);
  const allOptions: EmployeePickerOption[] = useMemo(
    () => (employees.data ?? []).map((e) => ({ employeeId: e.id, code: e.code, name: e.name })),
    [employees.data],
  );
  // Advances go to people still working here; the filter also lists those who left.
  const activeOptions: EmployeePickerOption[] = useMemo(
    () =>
      (employees.data ?? [])
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => ({ employeeId: e.id, code: e.code, name: e.name })),
    [employees.data],
  );

  if (!allowed) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to manage advances in this shop.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        description="Money given to staff ahead of salary."
        actions={
          <>
            <Button type="button" variant="solid" onClick={() => setGiveOpen(true)}>
              Give advance
            </Button>
            <HrInbox />
          </>
        }
      />
      <Text variant="caption" color="secondary">
        The monthly amount is taken from pay when a month&apos;s payroll is finalised, until the
        advance is repaid.
      </Text>

      <Box className={hrChrome.hrPageToolbar}>
        <EmployeePicker value={employeeId} employees={allOptions} onChange={setEmployeeId} />
        {employeeId ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEmployeeId('')}>
            Show everyone
          </Button>
        ) : null}
      </Box>

      {advances.error ? <Alert variant="danger">{advances.error.message}</Alert> : null}
      {employees.error ? <Alert variant="danger">{employees.error.message}</Alert> : null}

      <Card>
        <CardBody>
          <AdvancesTable
            advances={advances.data ?? []}
            loading={advances.isLoading}
            onStatement={(a) =>
              setStatementFor({
                employeeId: a.employeeId,
                name: a.employeeName ?? a.employeeCode ?? 'Employee',
                code: a.employeeCode,
              })
            }
            onCancel={setCancelTarget}
          />
        </CardBody>
      </Card>
      {!employeeId && (advances.data?.length ?? 0) >= 500 ? (
        <Text variant="caption" color="muted">
          Showing the newest 500 advances. Choose an employee to see all of theirs.
        </Text>
      ) : null}

      <GiveAdvanceModal
        open={giveOpen}
        onClose={() => setGiveOpen(false)}
        employees={activeOptions}
      />
      <CancelAdvanceModal advance={cancelTarget} onClose={() => setCancelTarget(null)} />
      <AdvanceStatementDrawer employee={statementFor} onClose={() => setStatementFor(null)} />
    </Stack>
  );
}
