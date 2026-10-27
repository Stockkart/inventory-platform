import { useState } from 'react';
import { Alert, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import type { AdvanceResponse, EmployeeResponse } from '@inventory-platform/hr/types';
import { useAdvancesQuery } from '../queries/hooks';
import { AdvanceStatementTable } from './AdvanceStatementTable';
import { AdvancesTable } from './AdvancesTable';
import { CancelAdvanceModal } from './CancelAdvanceModal';
import { GiveAdvanceModal } from './GiveAdvanceModal';

export interface EmployeeAdvancesTabProps {
  employee: EmployeeResponse;
}

/**
 * One employee's advances and statement (R7.2, R7.5). The page renders it only for users with
 * VIEW_SALARIES and MANAGE_ADVANCES (every advances endpoint needs MANAGE_ADVANCES).
 */
export function EmployeeAdvancesTab({ employee }: EmployeeAdvancesTabProps) {
  const advances = useAdvancesQuery(employee.id);
  const [giveOpen, setGiveOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdvanceResponse | null>(null);

  return (
    <Stack gap="md">
      <Inline gap="sm" justify="between" flexWrap>
        <Text variant="heading4" as="h3">
          Advances
        </Text>
        {employee.status === 'ACTIVE' ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setGiveOpen(true)}>
            Give advance
          </Button>
        ) : null}
      </Inline>
      {advances.error ? <Alert variant="danger">{advances.error.message}</Alert> : null}
      <AdvancesTable
        advances={advances.data ?? []}
        loading={advances.isLoading}
        hideEmployee
        onCancel={setCancelTarget}
      />

      <Text variant="heading4" as="h3">
        Statement
      </Text>
      <AdvanceStatementTable employeeId={employee.id} />

      <GiveAdvanceModal
        open={giveOpen}
        onClose={() => setGiveOpen(false)}
        employee={{ employeeId: employee.id, code: employee.code, name: employee.name }}
      />
      <CancelAdvanceModal advance={cancelTarget} onClose={() => setCancelTarget(null)} />
    </Stack>
  );
}
