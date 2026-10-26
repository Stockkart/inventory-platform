import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  ChoiceList,
  FilterDropdown,
  PageHeader,
  PaginationBar,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import {
  LEAVE_REQUEST_STATUSES,
  LEAVE_STATUS_LABELS,
  recentLeaveYears,
  todayIso,
  type LeaveDecision,
  type LeaveRequestResponse,
  type LeaveRequestStatus,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { deliverHrFile } from '../api/download';
import { leaveApi } from '../api/leave.api';
import {
  useDailyRegisterQuery,
  useHrDownload,
  useHrSettingsQuery,
  useLeaveBalancesQuery,
  useLeaveRequestsQuery,
} from '../queries/hooks';
import { HR_SETTINGS_PROFILE_PATH } from '../ui/HrGetStartedCard';
import { HrDownloadAlert } from '../ui/HrDownloadAlert';
import { HrInbox } from '../ui/HrInbox';
import { LeaveBalancesTable } from '../ui/LeaveBalancesTable';
import { LeaveDecisionModal } from '../ui/LeaveDecisionModal';
import { LeaveRequestsTable } from '../ui/LeaveRequestsTable';
import { RecordLeaveModal } from '../ui/RecordLeaveModal';

type StatusFilter = LeaveRequestStatus | 'ALL';

const STATUS_FILTERS = [
  ...LEAVE_REQUEST_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: LEAVE_STATUS_LABELS[s],
  })),
  { value: 'ALL' as StatusFilter, label: 'All' },
];

function RequestsTab() {
  const { can } = useHrAccess();
  const canDecide = can('APPROVE_LEAVE');
  const canMark = can('MARK_ATTENDANCE');
  const canCancel = canDecide || canMark;
  const today = todayIso();

  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [recordOpen, setRecordOpen] = useState(false);
  const [target, setTarget] = useState<{
    request: LeaveRequestResponse;
    decision: LeaveDecision;
  } | null>(null);

  const list = useLeaveRequestsQuery({
    status: status === 'ALL' ? undefined : status,
    page,
    size,
  });
  // Employees for the "Record leave" picker: everyone employed today, from the daily register
  // (VIEW_ATTENDANCE), so recording does not also need VIEW_EMPLOYEES.
  const register = useDailyRegisterQuery(today, canMark && recordOpen);
  const pickerEmployees = (register.data?.rows ?? []).map((r) => ({
    employeeId: r.employeeId,
    code: r.code,
    name: r.name,
  }));

  return (
    <Stack gap="md">
      <Box className={hrChrome.hrPageToolbar}>
        <SegmentedControl<StatusFilter>
          aria-label="Show requests"
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        />
        {canMark ? (
          <Box className={hrChrome.hrPageToolbarEnd}>
            <Button type="button" variant="solid" onClick={() => setRecordOpen(true)}>
              Record leave
            </Button>
          </Box>
        ) : null}
      </Box>

      {list.error ? <Alert variant="danger">{list.error.message}</Alert> : null}

      <Card>
        <CardBody>
          <LeaveRequestsTable
            requests={list.data?.items ?? []}
            loading={list.isLoading}
            canDecide={canDecide}
            canCancel={canCancel}
            onAction={(request, decision) => setTarget({ request, decision })}
          />
        </CardBody>
      </Card>

      <PaginationBar
        page={page}
        totalPages={list.data?.page.totalPages ?? 0}
        totalItems={list.data?.page.totalItems ?? 0}
        pageSize={size}
        // Backend caps page size at 100.
        pageSizeOptions={[20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setSize(n);
          setPage(0);
        }}
      />

      <LeaveDecisionModal target={target} onClose={() => setTarget(null)} />
      {canMark ? (
        <RecordLeaveModal
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          employees={pickerEmployees}
          defaultDate={today}
        />
      ) : null}
    </Stack>
  );
}

function BalancesTab() {
  const settings = useHrSettingsQuery();
  const years = recentLeaveYears(todayIso(), settings.data?.leaveYearStartMonth);
  // null = the server's current leave year until the user picks one.
  const [year, setYear] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const balances = useLeaveBalancesQuery(year);
  const shown = year ?? balances.data?.[0]?.leaveYear ?? years[0];
  const download = useHrDownload();

  return (
    <Stack gap="md">
      <Box className={hrChrome.hrPageToolbar}>
        <FilterDropdown label="Leave year" value={shown} open={open} onOpenChange={setOpen}>
          <ChoiceList
            aria-label="Leave year"
            options={years.map((y) => ({ value: y, label: y }))}
            value={shown ?? ''}
            onChange={(v) => {
              setYear(v);
              setOpen(false);
            }}
          />
        </FilterDropdown>
        <Box className={hrChrome.hrPageToolbarEnd}>
          {/* R12.4: the balances of the shown leave year as Excel (VIEW_ATTENDANCE). */}
          <Button
            type="button"
            variant="outline"
            loading={download.pending != null}
            onClick={() =>
              void download.run('balances-export', async () =>
                deliverHrFile(await leaveApi.balancesExport(shown ?? undefined), 'xlsx'),
              )
            }
          >
            Download Excel
          </Button>
        </Box>
      </Box>
      <HrDownloadAlert download={download} />
      {balances.error ? <Alert variant="danger">{balances.error.message}</Alert> : null}
      <Card>
        <CardBody>
          <LeaveBalancesTable rows={balances.data ?? []} loading={balances.isLoading} />
        </CardBody>
      </Card>
    </Stack>
  );
}

/**
 * Leave (R6.5–R6.13, R12.4): requests with approve / reject / cancel, recording leave for an
 * employee, and balances per leave year. Leave types live in HR settings.
 */
export function LeavePage() {
  const navigate = useNavigate();
  const { can } = useHrAccess();
  const [tab, setTab] = useState('requests');

  if (!can('VIEW_ATTENDANCE')) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see leave in this shop.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        description="Leave requests and balances."
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(HR_SETTINGS_PROFILE_PATH)}
            >
              Manage leave types
            </Button>
            <HrInbox />
          </>
        }
      />
      <Text variant="caption" color="secondary">
        Leave types and yearly quotas are set in HR settings.
      </Text>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'requests', label: 'Requests', panel: <RequestsTab /> },
          { value: 'balances', label: 'Balances', panel: <BalancesTab /> },
        ]}
      />
    </Stack>
  );
}
