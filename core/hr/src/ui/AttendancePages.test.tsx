import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import type {
  AttendanceRowResponse,
  DailyRegisterResponse,
  MonthRegisterResponse,
} from '@inventory-platform/hr/types';
import { AttendanceDailyPage } from '../pages/AttendanceDailyPage';
import { AttendanceMonthPage } from '../pages/AttendanceMonthPage';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceDayDrawer } from './AttendanceDayDrawer';

const attendanceApi = vi.hoisted(() => ({
  daily: vi.fn(),
  saveDays: vi.fn(),
  markUnmarkedPresent: vi.fn(),
  month: vi.fn(),
  history: vi.fn(),
  punches: vi.fn(),
  monthExport: vi.fn(),
}));
const download = vi.hoisted(() => ({ deliverHrFile: vi.fn() }));
vi.mock('../api/download', () => download);
const leaveApi = vi.hoisted(() => ({
  list: vi.fn(),
  record: vi.fn(),
  preview: vi.fn(),
  decide: vi.fn(),
  balances: vi.fn(),
}));
const settingsApi = vi.hoisted(() => ({ listLeaveTypes: vi.fn(), getSetupStatus: vi.fn() }));
vi.mock('../api/attendance.api', () => ({ attendanceApi }));
vi.mock('../api/leave.api', () => ({ leaveApi }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: settingsApi }));

const SHOP = 'shop-1';

function signIn(permissions: HrPermission[]) {
  useAuthStore.setState({ user: { shopId: SHOP, userId: 'u1' } } as never);
  useShopAccessStore.setState({
    byShopId: {
      [SHOP]: {
        owner: false,
        modules: { hr: true },
        hr: { permissions, employeeId: null },
      } as unknown as ShopAccess,
    },
  });
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/dashboard/hr/attendance', element: <AttendanceDailyPage /> },
      { path: '/dashboard/hr/attendance/month', element: <AttendanceMonthPage /> },
      { path: '/dashboard/hr/employees', element: <>Employees page</> },
      { path: '/dashboard/hr/employees/:employeeId', element: <>Employee detail page</> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function row(over: Partial<AttendanceRowResponse>): AttendanceRowResponse {
  return {
    employeeId: 'e1',
    code: 'EMP-001',
    name: 'Asha',
    date: '2026-10-06',
    status: 'UNMARKED',
    source: 'NONE',
    halfDayLeave: false,
    late: false,
    overtimeMinutes: 0,
    autoHalfDay: false,
    locked: false,
    ...over,
  };
}

const ASHA = row({ employeeId: 'e1', name: 'Asha', code: 'EMP-001' });
const RAVI = row({
  employeeId: 'e2',
  name: 'Ravi',
  code: 'EMP-002',
  status: 'PRESENT',
  source: 'MARK',
  inTime: '09:00',
});

function register(over: Partial<DailyRegisterResponse> = {}): DailyRegisterResponse {
  return { date: '2026-10-06', locked: false, rows: [ASHA, RAVI], ...over };
}

beforeEach(() => {
  attendanceApi.punches.mockResolvedValue([]);
  attendanceApi.daily.mockResolvedValue(register());
  attendanceApi.saveDays.mockResolvedValue([]);
  attendanceApi.markUnmarkedPresent.mockResolvedValue({ marked: 1 });
  settingsApi.listLeaveTypes.mockResolvedValue([
    { id: 't1', name: 'Casual', paid: true, yearlyQuotaDays: 12, active: true },
    { id: 't3', name: 'Unpaid leave', paid: false, yearlyQuotaDays: null, active: true },
  ]);
  leaveApi.preview.mockResolvedValue({
    days: 1,
    paid: true,
    available: 5,
    exceedsBalance: false,
    leaveYear: '2026',
  });
  leaveApi.record.mockResolvedValue({ id: 'r1', employeeName: 'Asha', days: 1 });
});

afterEach(() => {
  vi.clearAllMocks();
  useShopAccessStore.setState({ byShopId: {} });
  useAuthStore.setState({ user: null } as never);
});

describe('AttendanceDailyPage', () => {
  it('saves only the rows that changed', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.click(within(asha).getByRole('button', { name: 'Present' }));
    await user.type(screen.getByLabelText('In time, Asha'), '09:15');
    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));

    await waitFor(() => expect(attendanceApi.saveDays).toHaveBeenCalledTimes(1));
    const body = attendanceApi.saveDays.mock.calls[0][0];
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({ employeeId: 'e1', status: 'PRESENT', inTime: '09:15' });
  });

  it('clears a stored mark with UNMARKED', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Clear mark for Ravi' }));
    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));
    await waitFor(() =>
      expect(attendanceApi.saveDays).toHaveBeenCalledWith({
        rows: [expect.objectContaining({ employeeId: 'e2', status: 'UNMARKED' })],
      }),
    );
  });

  it('marks all unmarked as Present for the shown date', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Mark all unmarked as Present' }));
    await waitFor(() => expect(attendanceApi.markUnmarkedPresent).toHaveBeenCalledTimes(1));
    const body = attendanceApi.markUnmarkedPresent.mock.calls[0][0];
    expect(body.dates).toHaveLength(1);
    expect(body.dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.employeeIds).toBeUndefined();
  });

  it('"Leave" records leave for the day instead of saving a mark', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    await user.click(within(asha).getByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Record leave for Asha')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Leave type/ }));
    await user.click(await screen.findByRole('option', { name: /Casual/ }));
    expect(await screen.findByText(/5 days left before this/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record leave' }));

    await waitFor(() => expect(leaveApi.record).toHaveBeenCalledTimes(1));
    const body = leaveApi.record.mock.calls[0][0];
    expect(body).toMatchObject({ employeeId: 'e1', leaveTypeId: 't1' });
    expect(body.fromDate).toBe(body.toDate);
    expect(attendanceApi.saveDays).not.toHaveBeenCalled();
  });

  it('stops a paid type over the balance and suggests unpaid leave', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    leaveApi.preview.mockResolvedValue({
      days: 1,
      paid: true,
      available: 0,
      exceedsBalance: true,
      leaveYear: '2026',
    });
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    await user.click(within(asha).getByRole('button', { name: 'Leave' }));
    await user.click(await screen.findByRole('button', { name: /Leave type/ }));
    await user.click(await screen.findByRole('option', { name: /Casual/ }));
    expect(await screen.findByText(/Choose an unpaid leave type/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record leave' }));
    expect(leaveApi.record).not.toHaveBeenCalled();
  });

  it('shows the locked banner and disables edits in a locked month', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({ locked: true, rows: [{ ...ASHA, locked: true }] }),
    );
    renderAt('/dashboard/hr/attendance');

    expect(
      await screen.findByText(/is finalised, so this day cannot be changed/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Attendance for Asha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mark all unmarked as Present' }),
    ).not.toBeInTheDocument();
  });

  it('is read-only without MARK_ATTENDANCE', async () => {
    signIn(['VIEW_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    expect(
      await screen.findByText('You can see attendance but not mark or change it.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Present' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Attendance for/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('In time, Asha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark all/ })).not.toBeInTheDocument();
  });

  it('links to employees when nobody is employed', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [] }));
    renderAt('/dashboard/hr/attendance');
    expect(await screen.findByRole('button', { name: 'Go to employees' })).toBeInTheDocument();
  });
});

const MONTH: MonthRegisterResponse = {
  period: '2026-10',
  locked: false,
  dates: ['2026-10-01', '2026-10-02', '2026-10-03'],
  rows: [
    {
      employeeId: 'e1',
      code: 'EMP-001',
      name: 'Asha',
      cells: [{ status: 'PRESENT', late: true }, { status: 'LEAVE' }, { status: 'UNMARKED' }],
      totals: {
        present: 1,
        halfDays: 0,
        absent: 0,
        leave: 1,
        weekOff: 0,
        holiday: 0,
        unmarked: 1,
        lateDays: 1,
        workedMinutes: 0,
        overtimeMinutes: 0,
      },
    },
  ],
};

describe('AttendanceMonthPage', () => {
  it('renders the register with totals and opens a day with its history', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(MONTH);
    attendanceApi.history.mockResolvedValue({
      employeeId: 'e1',
      date: '2026-10-01',
      status: 'PRESENT',
      source: 'MANUAL',
      markedAt: '2026-10-01T04:00:00Z',
      markedByUserId: 'u1',
      events: [
        {
          action: 'ATTENDANCE_SET',
          actorUserId: 'u9',
          actorName: 'Ravi Kumar',
          at: '2026-10-02T04:00:00Z',
          before: { status: 'ABSENT' },
          after: { status: 'PRESENT' },
        },
      ],
    });
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    const ashaRow = within(table).getByRole('row', { name: /Asha/ });
    const totals = Array.from(ashaRow.querySelectorAll('[data-total]')).map((c) => [
      c.getAttribute('data-total'),
      c.textContent,
    ]);
    expect(totals).toEqual([
      ['present', '1'],
      ['halfDays', '0'],
      ['leave', '1'],
      ['absent', '0'],
      ['weekOff', '0'],
      ['holiday', '0'],
      ['unmarked', '1'],
    ]);

    await user.click(
      within(table).getByRole('button', { name: /Asha, Thu, 1 Oct: Present, late/ }),
    );
    expect(await screen.findByText('Mark changed: Absent → Present')).toBeInTheDocument();
    // Names come from the server (`actorName`, run B4); the signed-in user is "you".
    expect(screen.getByText(/by Ravi Kumar/)).toBeInTheDocument();
    expect(screen.getByText(/by you/)).toBeInTheDocument();
    expect(attendanceApi.history).toHaveBeenCalledWith('e1', '2026-10-01');
  });

  it('does not ask for history without MARK_ATTENDANCE', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(MONTH);
    renderAt('/dashboard/hr/attendance/month');

    await user.click(await screen.findByRole('button', { name: /Asha, Fri, 2 Oct: Leave/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(attendanceApi.history).not.toHaveBeenCalled();
  });
});

// Run F8: "future" is the server's `Cell.future` flag (run B6), not the browser clock. Today is
// 2 Oct here only because the server says so; 3 Oct is a future Unmarked day, 4 Oct a future
// holiday.
const FUTURE_MONTH: MonthRegisterResponse = {
  ...MONTH,
  dates: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
  rows: [
    {
      ...MONTH.rows[0],
      cells: [
        { status: 'PRESENT', late: true },
        { status: 'LEAVE' },
        { status: 'UNMARKED', future: true },
        { status: 'HOLIDAY', future: true },
      ],
      totals: { ...MONTH.rows[0].totals, unmarked: 0, holiday: 1 },
    },
  ],
};

describe('future days from the server flag (runs F7, F8)', () => {
  it('shows a future Unmarked day blank in the register, read as "not yet", with nothing to open', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(FUTURE_MONTH);
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    expect(within(table).getByText('Asha, Sat, 3 Oct: not yet')).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /Asha, Sat, 3 Oct/ })).toBeNull();
    // Today and earlier still open the day.
    expect(
      within(table).getByRole('button', { name: /Asha, Fri, 2 Oct: Leave/ }),
    ).toBeInTheDocument();
    expect(attendanceApi.history).not.toHaveBeenCalled();
  });

  it('shows a future holiday with its status and opens it without fetching history', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(FUTURE_MONTH);
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    expect(within(table).queryByText('Asha, Sun, 4 Oct: not yet')).toBeNull();
    await user.click(within(table).getByRole('button', { name: /Asha, Sun, 4 Oct: Holiday/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Holiday')).toBeInTheDocument();
    expect(within(dialog).queryByText(/This day has not come yet/)).toBeNull();
    expect(within(dialog).queryByText('History')).toBeNull();
    expect(attendanceApi.history).not.toHaveBeenCalled();
  });

  it('does not blank a day the server did not flag, whatever the date', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue({
      ...MONTH,
      period: '2099-10',
      dates: ['2099-10-01', '2099-10-02', '2099-10-03'],
    });
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    expect(within(table).queryByText(/not yet/)).toBeNull();
    expect(
      within(table).getByRole('button', { name: /Asha, Sat, 3 Oct: Unmarked/ }),
    ).toBeInTheDocument();
  });

  it('shows future Unmarked days blank in the calendar and keeps a future holiday (employee tab and My HR)', () => {
    render(
      <AttendanceCalendar
        period="2026-10"
        row={FUTURE_MONTH.rows[0]}
        dates={FUTURE_MONTH.dates}
        caption="Asha, October 2026"
      />,
    );
    const day3 = screen.getByText('Sat, 3 Oct: not yet');
    expect(day3).toBeInTheDocument();
    // No status letter or word for the future Unmarked day; the past days and the future holiday
    // keep theirs.
    expect(screen.queryByText(/Sat, 3 Oct: Unmarked/)).toBeNull();
    expect(screen.queryByText(/Fri, 2 Oct: not yet/)).toBeNull();
    expect(screen.queryByText(/Sun, 4 Oct: not yet/)).toBeNull();
    expect(screen.getByRole('img', { name: 'Sun, 4 Oct: Holiday' })).toBeInTheDocument();
  });

  it('the day drawer does not fetch history for a future day', () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AttendanceDayDrawer
          day={{
            employeeId: 'e1',
            name: 'Asha',
            date: '2026-10-03',
            cell: { status: 'UNMARKED', future: true },
          }}
          canSeeHistory
          onClose={() => undefined}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/This day has not come yet/)).toBeInTheDocument();
    expect(screen.queryByText('History')).toBeNull();
    expect(attendanceApi.history).not.toHaveBeenCalled();
  });
});

describe('AttendanceMonthPage Excel download (run F5)', () => {
  it('downloads the shown month as Excel', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(MONTH);
    const file = { blob: new Blob(['x']), filename: 'attendance-2026-10.xlsx' };
    attendanceApi.monthExport.mockResolvedValue(file);
    renderAt('/dashboard/hr/attendance/month');

    await user.click(await screen.findByRole('button', { name: 'Download Excel' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledWith(file, 'xlsx'));
    expect(attendanceApi.monthExport).toHaveBeenCalledWith(MONTH.period);
  });

  it('shows the server busy message as a toast and downloads again on request', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(MONTH);
    attendanceApi.monthExport
      .mockRejectedValueOnce(new Error('The server is busy. Please try again in a few seconds'))
      .mockResolvedValue({ blob: new Blob(['x']), filename: 'a.xlsx' });
    renderAt('/dashboard/hr/attendance/month');

    await user.click(await screen.findByRole('button', { name: 'Download Excel' }));
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/The server is busy/)),
    );
    expect(download.deliverHrFile).not.toHaveBeenCalled();
    // The toast has no retry button: pressing Download again repeats it.
    await user.click(screen.getByRole('button', { name: 'Download Excel' }));
    await waitFor(() => expect(download.deliverHrFile).toHaveBeenCalledTimes(1));
    expect(attendanceApi.monthExport).toHaveBeenCalledTimes(2);
  });
});

describe('compact daily rows (run F9)', () => {
  it('shows in/out times only for Present and Half-day', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    // Unmarked: no time boxes, no note.
    expect(screen.queryByLabelText('In time, Asha')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add note for Asha' })).not.toBeInTheDocument();
    // Ravi is Present: both boxes, filled from the server.
    expect(screen.getByLabelText('In time, Ravi')).toHaveValue('09:00');
    expect(screen.getByLabelText('Out time, Ravi')).toBeInTheDocument();

    await user.click(within(asha).getByRole('button', { name: 'Absent' }));
    expect(screen.queryByLabelText('In time, Asha')).not.toBeInTheDocument();
    await user.click(within(asha).getByRole('button', { name: 'Half-day' }));
    expect(screen.getByLabelText('In time, Asha')).toBeInTheDocument();
    expect(screen.getByLabelText('Out time, Asha')).toBeInTheDocument();
  });

  it('keeps the note behind a small button and saves it with the changed row only', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    const noteButton = await screen.findByRole('button', { name: 'Add note for Ravi' });
    expect(screen.queryByLabelText('Note, Ravi')).not.toBeInTheDocument();
    expect(noteButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(noteButton);
    expect(noteButton).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('dialog', { name: 'Note for Ravi' });
    const input = within(panel).getByLabelText('Note, Ravi');
    expect(input).toHaveFocus();
    await user.type(input, 'Left early');
    // Escape closes the panel and gives focus back to the button, which now reads "Edit".
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Note for Ravi' })).not.toBeInTheDocument();
    const editButton = screen.getByRole('button', { name: 'Edit note for Ravi' });
    expect(editButton).toHaveFocus();

    // Reopen shows the typed note; Done closes it.
    await user.click(editButton);
    expect(screen.getByLabelText('Note, Ravi')).toHaveValue('Left early');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByLabelText('Note, Ravi')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));
    await waitFor(() => expect(attendanceApi.saveDays).toHaveBeenCalledTimes(1));
    const body = attendanceApi.saveDays.mock.calls[0][0];
    expect(body.rows).toEqual([
      expect.objectContaining({ employeeId: 'e2', status: 'PRESENT', note: 'Left early' }),
    ]);
  });

  it('closes the note on a click outside', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Add note for Ravi' }));
    expect(screen.getByRole('dialog', { name: 'Note for Ravi' })).toBeInTheDocument();
    await user.click(screen.getByText(/employees ·/));
    expect(screen.queryByRole('dialog', { name: 'Note for Ravi' })).not.toBeInTheDocument();
  });

  it('closes the note when focus leaves it (run F10)', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Add note for Ravi' }));
    const panel = screen.getByRole('dialog', { name: 'Note for Ravi' });
    expect(within(panel).getByLabelText('Note, Ravi')).toHaveFocus();
    // Tab inside the popover keeps it open (input -> Done).
    await user.tab();
    expect(within(panel).getByRole('button', { name: 'Done' })).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Note for Ravi' })).toBeInTheDocument();
    // Tab out of it closes it.
    await user.tab();
    expect(screen.queryByRole('dialog', { name: 'Note for Ravi' })).not.toBeInTheDocument();
  });

  it('puts the chips before the code and designation (run F10)', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({
            employeeId: 'e1',
            name: 'Asha',
            code: 'E-001',
            designation: 'Senior sales associate',
            late: true,
          }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const late = await screen.findByText('Late');
    const meta = screen.getByText('E-001 · Senior sales associate');
    expect(late.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a half-day leave row without Leave and a read-only full-day leave row', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({ employeeId: 'e1', name: 'Asha', halfDayLeave: true, status: 'UNMARKED' }),
          row({ employeeId: 'e2', name: 'Ravi', status: 'LEAVE', source: 'LEAVE' }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    expect(within(asha).queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
    expect(within(asha).getByRole('button', { name: 'Half-day' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Attendance for Ravi' })).not.toBeInTheDocument();
    expect(screen.getByText('Change or cancel the leave on the Leave page.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /note for Ravi/ })).not.toBeInTheDocument();
  });
});

describe('month register names (run F9)', () => {
  it('shows the employee name as a link to the employee page', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'VIEW_EMPLOYEES']);
    attendanceApi.month.mockResolvedValue(MONTH);
    renderAt('/dashboard/hr/attendance/month');

    const link = await screen.findByRole('button', { name: 'Asha' });
    expect(link.className).toMatch(/linkButton/);
    await user.click(link);
    expect(await screen.findByText('Employee detail page')).toBeInTheDocument();
  });

  it('keeps the name as plain text without VIEW_EMPLOYEES', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue(MONTH);
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    expect(within(table).getByText('Asha')).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Asha' })).not.toBeInTheDocument();
  });
});

describe('self check-in on the registers', () => {
  it('shows the phone icon and capture chips on the daily row, nothing for a hand mark', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({
            employeeId: 'e1',
            name: 'Asha',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'SELF_CHECK_IN',
            inTime: '09:12',
            missingCheckOut: true,
            flags: ['OUTSIDE_SHOP', 'LOW_ACCURACY', 'NO_LOCATION'],
          }),
          { ...RAVI, markSource: 'MANUAL' },
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('listitem', { name: 'Asha' });
    expect(within(asha).getByRole('img', { name: 'by phone' })).toBeInTheDocument();
    expect(within(asha).getByText('Missing check-out')).toBeInTheDocument();
    expect(within(asha).getByText('Outside shop')).toBeInTheDocument();
    expect(within(asha).getAllByText('Location unclear')).toHaveLength(1);
    const ravi = screen.getByRole('listitem', { name: 'Ravi' });
    expect(within(ravi).queryByRole('img', { name: 'by phone' })).toBeNull();
  });

  it('marks a phone day in the month cell and lists its punches in the drawer', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue({
      ...MONTH,
      rows: [
        {
          ...MONTH.rows[0],
          cells: MONTH.rows[0].cells.map((c, i) =>
            i === 0 ? { ...c, markSource: 'SELF_CHECK_IN' as const } : c,
          ),
        },
      ],
    });
    attendanceApi.punches.mockResolvedValue([
      {
        id: 'p1',
        employeeId: 'e1',
        at: '2026-10-01T03:42:00Z',
        direction: 'IN',
        source: 'SELF',
        distanceMetres: 42,
      },
      {
        id: 'p2',
        employeeId: 'e1',
        at: '2026-10-01T13:10:00Z',
        time: '18:40',
        direction: 'OUT',
        source: 'SELF',
        distanceMetres: 310,
        flags: ['OUTSIDE_SHOP'],
      },
      {
        id: 'p3',
        employeeId: 'e1',
        at: '2026-10-01T13:12:00Z',
        time: '18:42',
        direction: 'OUT',
        source: 'SELF',
        counted: false,
      },
    ]);
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    await user.click(within(table).getByRole('button', { name: /Asha, Thu, 1 Oct: .*by phone/ }));

    const list = await screen.findByRole('list', { name: 'Check-ins on this day' });
    expect(within(list).getByText('09:12 · In by phone')).toBeInTheDocument();
    expect(within(list).getByText('42 m from shop')).toBeInTheDocument();
    expect(within(list).getByText('18:40 · Out by phone')).toBeInTheDocument();
    expect(within(list).getByText('310 m from shop · Outside shop')).toBeInTheDocument();
    expect(within(list).getByText(/Not counted/)).toBeInTheDocument();
    expect(attendanceApi.punches).toHaveBeenCalledWith('e1', '2026-10-01');
  });
});
