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
  type BadgeVariant,
} from '@inventory-platform/ui-kit';
import {
  LEAVE_STATUS_LABELS,
  formatDayRange,
  formatDays,
  type LeaveDecision,
  type LeaveRequestResponse,
  type LeaveRequestStatus,
} from '@inventory-platform/hr/types';

const STATUS_VARIANT: Record<LeaveRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export interface LeaveRequestsTableProps {
  requests: readonly LeaveRequestResponse[];
  loading?: boolean;
  /** APPROVE_LEAVE: approve/reject pending requests. */
  canDecide: boolean;
  /** APPROVE_LEAVE or MARK_ATTENDANCE: cancel pending or approved requests. */
  canCancel: boolean;
  onAction: (request: LeaveRequestResponse, decision: LeaveDecision) => void;
  /** Hide the employee column (employee detail page). */
  hideEmployee?: boolean;
  /**
   * Extra rule for showing Cancel on a request (My HR: own requests in months that are not
   * locked). Default: every PENDING or APPROVED request.
   */
  isCancellable?: (request: LeaveRequestResponse) => boolean;
  /** Who the action buttons name; default the employee ("Cancel leave for Asha"). */
  actionSubject?: (request: LeaveRequestResponse) => string;
}

/** Leave requests with status and the actions the user may take on each (R6.7, R6.8). */
export function LeaveRequestsTable({
  requests,
  loading,
  canDecide,
  canCancel,
  onAction,
  hideEmployee = false,
  isCancellable,
  actionSubject,
}: LeaveRequestsTableProps) {
  const showActions = canDecide || canCancel;
  const cols = 5 + (hideEmployee ? 0 : 1) + (showActions ? 1 : 0);
  return (
    <Table aria-label="Leave requests">
      <TableHead>
        <TableRow>
          {hideEmployee ? null : <TableHeaderCell>Employee</TableHeaderCell>}
          <TableHeaderCell>Leave type</TableHeaderCell>
          <TableHeaderCell>Dates</TableHeaderCell>
          <TableHeaderCell>Days</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Reason</TableHeaderCell>
          {showActions ? <TableHeaderCell>Actions</TableHeaderCell> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableLoadingRow colSpan={cols} />
        ) : requests.length === 0 ? (
          <TableEmptyRow colSpan={cols} message="No leave requests" />
        ) : (
          requests.map((r) => {
            const who = r.employeeName ?? r.employeeCode ?? 'Employee';
            const pending = r.status === 'PENDING';
            const cancellable =
              (r.status === 'PENDING' || r.status === 'APPROVED') &&
              (isCancellable ? isCancellable(r) : true);
            const subject = actionSubject ? actionSubject(r) : `for ${who}`;
            return (
              <TableRow key={r.id}>
                {hideEmployee ? null : (
                  <TableCell>
                    <Text as="span">{who}</Text>{' '}
                    {r.employeeCode ? (
                      <Text as="span" variant="caption" color="muted">
                        {r.employeeCode}
                      </Text>
                    ) : null}
                  </TableCell>
                )}
                <TableCell>{r.leaveTypeName ?? 'Leave'}</TableCell>
                <TableCell>
                  {formatDayRange(r.fromDate, r.toDate)}
                  {r.halfDay ? ' (half day)' : ''}
                </TableCell>
                <TableCell>{formatDays(r.days)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{LEAVE_STATUS_LABELS[r.status]}</Badge>
                  {r.origin === 'RECORDED' ? (
                    <Text as="span" variant="caption" color="muted">
                      {' '}
                      Recorded
                    </Text>
                  ) : null}
                </TableCell>
                <TableCell>
                  {r.reason || '—'}
                  {r.decisionNote ? (
                    <Text variant="caption" color="muted">
                      Note: {r.decisionNote}
                    </Text>
                  ) : null}
                </TableCell>
                {showActions ? (
                  <TableCell>
                    <Inline gap="xs" flexWrap>
                      {canDecide && pending ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="solid"
                            aria-label={`Approve leave for ${who}`}
                            onClick={() => onAction(r, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Reject leave for ${who}`}
                            onClick={() => onAction(r, 'reject')}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {canCancel && cancellable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Cancel leave ${subject}`}
                          onClick={() => onAction(r, 'cancel')}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </Inline>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
