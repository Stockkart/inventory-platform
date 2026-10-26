import { useState } from 'react';
import { Alert, Button, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import {
  todayIso,
  type EmployeeResponse,
  type LeaveDecision,
  type LeaveRequestResponse,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useLeaveBalancesQuery, useLeaveRequestsQuery } from '../queries/hooks';
import { LeaveBalancesTable } from './LeaveBalancesTable';
import { LeaveDecisionModal } from './LeaveDecisionModal';
import { LeaveRequestsTable } from './LeaveRequestsTable';
import { RecordLeaveModal } from './RecordLeaveModal';

export interface EmployeeLeaveTabProps {
  employee: EmployeeResponse;
}

/** Shown at once; older requests are on the Leave page. */
const RECENT_REQUESTS = 20;

/**
 * One employee's leave: balances for the current leave year and their requests, newest first.
 * Balances come from `GET /leave-balances?employeeId=` (server filter since run B4).
 */
export function EmployeeLeaveTab({ employee }: EmployeeLeaveTabProps) {
  const { can } = useHrAccess();
  const canDecide = can('APPROVE_LEAVE');
  const canMark = can('MARK_ATTENDANCE');
  const [recordOpen, setRecordOpen] = useState(false);
  const [target, setTarget] = useState<{
    request: LeaveRequestResponse;
    decision: LeaveDecision;
  } | null>(null);

  const balances = useLeaveBalancesQuery(null, true, employee.id);
  const requests = useLeaveRequestsQuery({ employeeId: employee.id, size: RECENT_REQUESTS });
  // The server already filtered; the check only guards against an older backend's full list.
  const mine = (balances.data ?? []).filter((r) => r.employeeId === employee.id);

  return (
    <Stack gap="md">
      <Inline gap="sm" justify="between" flexWrap>
        <Text variant="heading4" as="h3">
          Balances{mine[0] ? ` for ${mine[0].leaveYear}` : ''}
        </Text>
        {canMark && employee.status === 'ACTIVE' ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setRecordOpen(true)}>
            Record leave
          </Button>
        ) : null}
      </Inline>
      {balances.error ? <Alert variant="danger">{balances.error.message}</Alert> : null}
      <LeaveBalancesTable rows={mine} loading={balances.isLoading} hideEmployee />

      <Text variant="heading4" as="h3">
        Requests
      </Text>
      {requests.error ? <Alert variant="danger">{requests.error.message}</Alert> : null}
      <LeaveRequestsTable
        requests={requests.data?.items ?? []}
        loading={requests.isLoading}
        canDecide={canDecide}
        canCancel={canDecide || canMark}
        onAction={(request, decision) => setTarget({ request, decision })}
        hideEmployee
      />

      <LeaveDecisionModal target={target} onClose={() => setTarget(null)} />
      {canMark ? (
        <RecordLeaveModal
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          employee={{ employeeId: employee.id, code: employee.code, name: employee.name }}
          defaultDate={todayIso()}
        />
      ) : null}
    </Stack>
  );
}
