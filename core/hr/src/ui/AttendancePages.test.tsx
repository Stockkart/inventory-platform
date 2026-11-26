import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HrPermission, ShopAccess } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  todayIso,
  type AttendanceRowResponse,
  type DailyRegisterResponse,
  type MonthRegisterResponse,
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
  // The page opens on the current month; pin the clock to the fixture's month
  // so the test does not depend on the day it runs. Only Date is faked, so
  // userEvent's timers stay real.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('09:12 · In')).toBeInTheDocument();
    expect(within(items[0]).getByText('My HR')).toBeInTheDocument();
    expect(within(items[0]).getByText('42 m from shop')).toBeInTheDocument();
    expect(within(items[1]).getByText('18:40 · Out')).toBeInTheDocument();
    expect(within(items[1]).getByText('310 m from shop · Outside shop')).toBeInTheDocument();
    expect(within(items[2]).getByText(/Not counted/)).toBeInTheDocument();
    expect(attendanceApi.punches).toHaveBeenCalledWith('e1', '2026-10-01');
  });
});

describe('hand-mark reason for Attendance app users (R7.1–R7.4)', () => {
  const PAIRED_ASHA = { ...ASHA, markReasonRequired: true };

  it('asks for a reason only when a changed row needs one, and sends it on that row only', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [PAIRED_ASHA, RAVI] }));
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    await user.click(within(asha).getByRole('button', { name: 'Present' }));
    const ravi = screen.getByRole('group', { name: 'Attendance for Ravi' });
    await user.click(within(ravi).getByRole('button', { name: 'Absent' }));
    await user.click(screen.getByRole('button', { name: 'Save 2 changes' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Why mark this by hand?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Asha uses the Attendance app/)).toBeInTheDocument();
    expect(attendanceApi.saveDays).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('radio', { name: 'Phone not working' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save 2 changes' }));

    await waitFor(() => expect(attendanceApi.saveDays).toHaveBeenCalledTimes(1));
    const rows = attendanceApi.saveDays.mock.calls[0][0].rows;
    expect(rows).toHaveLength(2);
    expect(rows.find((r: { employeeId: string }) => r.employeeId === 'e1')).toMatchObject({
      status: 'PRESENT',
      reason: 'PHONE_NOT_WORKING',
      reasonText: null,
    });
    const raviRow = rows.find((r: { employeeId: string }) => r.employeeId === 'e2');
    expect(raviRow).toMatchObject({ status: 'ABSENT' });
    expect(raviRow).not.toHaveProperty('reason');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('saves without any prompt when no changed row needs a reason', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [PAIRED_ASHA, RAVI] }));
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Clear mark for Ravi' }));
    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));

    await waitFor(() => expect(attendanceApi.saveDays).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
    const [sent] = attendanceApi.saveDays.mock.calls[0][0].rows;
    expect(sent).toMatchObject({ employeeId: 'e2', status: 'UNMARKED' });
    expect(sent).not.toHaveProperty('reason');
  });

  it('cancelling the prompt saves nothing and keeps the edit', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [PAIRED_ASHA, RAVI] }));
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    await user.click(within(asha).getByRole('button', { name: 'Present' }));
    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(attendanceApi.saveDays).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save 1 change' })).toBeEnabled();
  });

  it('shows the server’s "reason is required" message and leaves the day unchanged', async () => {
    const user = userEvent.setup();
    const notifyError = vi.spyOn(useNotify, 'error');
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [PAIRED_ASHA, RAVI] }));
    attendanceApi.saveDays.mockRejectedValue(
      new Error('A reason is required when the employee uses the Attendance app'),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('group', { name: 'Attendance for Asha' });
    await user.click(within(asha).getByRole('button', { name: 'Present' }));
    await user.click(screen.getByRole('button', { name: 'Save 1 change' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: 'Forgot phone' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save 1 change' }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'A reason is required when the employee uses the Attendance app',
      ),
    );
    // The register is refetched (the mutation always invalidates) and still shows the day as it
    // was; the edit is kept and the prompt stays open so the manager can try again or cancel.
    await waitFor(() => expect(attendanceApi.daily).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save 1 change' })).toHaveLength(2);
  });

  it('"Mark all unmarked as Present" asks once and sends the reason with the batch', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          PAIRED_ASHA,
          row({ employeeId: 'e3', name: 'Meena', code: 'EMP-003', markReasonRequired: true }),
          row({ employeeId: 'e4', name: 'Sunil', code: 'EMP-004' }),
          RAVI,
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Mark all unmarked as Present' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Asha and Meena use the Attendance app/)).toBeInTheDocument();
    expect(attendanceApi.markUnmarkedPresent).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('radio', { name: 'Other' }));
    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), ' app down ');
    await user.click(within(dialog).getByRole('button', { name: 'Mark as Present' }));

    await waitFor(() => expect(attendanceApi.markUnmarkedPresent).toHaveBeenCalledTimes(1));
    expect(attendanceApi.markUnmarkedPresent.mock.calls[0][0]).toMatchObject({
      reason: 'OTHER',
      reasonText: 'app down',
    });
    expect(attendanceApi.markUnmarkedPresent.mock.calls[0][0].dates).toHaveLength(1);
  });

  it('"Mark all unmarked as Present" sends no reason when nobody unmarked needs one', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    // Ravi is paired but already marked, so the batch does not touch him.
    attendanceApi.daily.mockResolvedValue(
      register({ rows: [ASHA, { ...RAVI, markReasonRequired: true }] }),
    );
    renderAt('/dashboard/hr/attendance');

    await user.click(await screen.findByRole('button', { name: 'Mark all unmarked as Present' }));
    await waitFor(() => expect(attendanceApi.markUnmarkedPresent).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(attendanceApi.markUnmarkedPresent.mock.calls[0][0]).not.toHaveProperty('reason');
  });
});

// HR-module task 10.5: source icons, chips, the "No punch yet" hint, drawer rows and the
// Source / Flagged filters (R7.7–R7.8, R8.1–R8.7, R8.10–R8.11).
describe('register source icons (R8.1–R8.2)', () => {
  it('shows one icon per daily row: hand, phone or fingerprint, and none for an empty day', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({
            employeeId: 'e1',
            name: 'Asha',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'MANUAL',
          }),
          row({
            employeeId: 'e2',
            name: 'Ravi',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'SELF_CHECK_IN',
            punchSource: 'SELF',
          }),
          row({
            employeeId: 'e3',
            name: 'Meena',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'BIOMETRIC_APP',
            punchSource: 'BIOMETRIC_APP',
          }),
          row({ employeeId: 'e4', name: 'Sunil', status: 'UNMARKED', source: 'NONE' }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('listitem', { name: 'Asha' });
    expect(within(asha).getByRole('img', { name: 'by hand' })).toHaveAttribute(
      'data-source',
      'HAND',
    );
    const ravi = screen.getByRole('listitem', { name: 'Ravi' });
    expect(within(ravi).getByRole('img', { name: 'by phone' })).toHaveAttribute(
      'data-source',
      'PHONE',
    );
    const meena = screen.getByRole('listitem', { name: 'Meena' });
    expect(within(meena).getByRole('img', { name: 'by Attendance app' })).toHaveAttribute(
      'data-source',
      'APP',
    );
    const sunil = screen.getByRole('listitem', { name: 'Sunil' });
    expect(within(sunil).queryByRole('img', { name: /^by / })).toBeNull();
  });

  it('a hand mark wins over the day’s app punches on the daily row', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({
            employeeId: 'e1',
            name: 'Asha',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'MANUAL',
            punchSource: 'BIOMETRIC_APP',
          }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');
    const asha = await screen.findByRole('listitem', { name: 'Asha' });
    expect(within(asha).getByRole('img', { name: 'by hand' })).toBeInTheDocument();
    expect(within(asha).queryByRole('img', { name: 'by Attendance app' })).toBeNull();
  });

  it('speaks the source on the month cell and marks it with the fingerprint', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue({
      ...MONTH,
      rows: [
        {
          ...MONTH.rows[0],
          cells: [
            { status: 'PRESENT', markSource: 'BIOMETRIC_APP' },
            { status: 'PRESENT', markSource: 'SELF_CHECK_IN' },
            { status: 'ABSENT' },
          ],
        },
      ],
    });
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    const app = within(table).getByRole('button', {
      name: 'Asha, Thu, 1 Oct: Present, by Attendance app. Show day detail',
    });
    expect(
      within(app).getByRole('img', { name: 'Present, by Attendance app' }),
    ).toBeInTheDocument();
    expect(app.querySelector('[data-source="APP"]')).not.toBeNull();
    expect(
      within(table).getByRole('button', {
        name: 'Asha, Fri, 2 Oct: Present, by phone. Show day detail',
      }),
    ).toBeInTheDocument();
    // The month register leaves MANUAL out of the cell; a stored Absent is still a hand mark.
    expect(
      within(table).getByRole('button', {
        name: 'Asha, Sat, 3 Oct: Absent, by hand. Show day detail',
      }),
    ).toBeInTheDocument();
  });
});

describe('register chips and the "No punch yet" hint (R7.7–R7.8, R8.3–R8.4)', () => {
  it('shows Fake location and Recorded offline at most once each, next to the existing chips', async () => {
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({
            employeeId: 'e1',
            name: 'Asha',
            status: 'PRESENT',
            source: 'MARK',
            markSource: 'BIOMETRIC_APP',
            missingCheckOut: true,
            flags: [
              'RECORDED_OFFLINE',
              'FAKE_LOCATION',
              'RECORDED_OFFLINE',
              'OUTSIDE_SHOP',
              'LOW_ACCURACY',
              'NO_LOCATION',
            ],
          }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('listitem', { name: 'Asha' });
    expect(within(asha).getAllByText('Fake location')).toHaveLength(1);
    expect(within(asha).getAllByText('Recorded offline')).toHaveLength(1);
    expect(within(asha).getAllByText('Outside shop')).toHaveLength(1);
    expect(within(asha).getAllByText('Location unclear')).toHaveLength(1);
    expect(within(asha).getAllByText('Missing check-out')).toHaveLength(1);
  });

  it('shows "No punch yet" only on rows the server flags', async () => {
    signIn(['VIEW_ATTENDANCE', 'MARK_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(
      register({
        rows: [
          row({ employeeId: 'e1', name: 'Asha', noPunchYet: true, markReasonRequired: true }),
          row({ employeeId: 'e2', name: 'Ravi', noPunchYet: false, markReasonRequired: true }),
          row({ employeeId: 'e3', name: 'Meena' }),
        ],
      }),
    );
    renderAt('/dashboard/hr/attendance');

    const asha = await screen.findByRole('listitem', { name: 'Asha' });
    expect(within(asha).getByText('No punch yet')).toBeInTheDocument();
    // The hint does not change the day: it is still Unmarked and can be marked.
    expect(within(asha).getByRole('group', { name: 'Attendance for Asha' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: 'Ravi' })).queryByText('No punch yet'),
    ).toBeNull();
    expect(
      within(screen.getByRole('listitem', { name: 'Meena' })).queryByText('No punch yet'),
    ).toBeNull();
  });
});

describe('day drawer punch rows (R8.5–R8.7)', () => {
  it('shows time, source, distance or "—", every flag, the phone model for app punches, and greys out duplicates', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue({
      ...MONTH,
      rows: [
        {
          ...MONTH.rows[0],
          cells: [
            { status: 'PRESENT', markSource: 'BIOMETRIC_APP' },
            { status: 'LEAVE' },
            { status: 'UNMARKED' },
          ],
        },
      ],
    });
    attendanceApi.punches.mockResolvedValue([
      {
        id: 'p1',
        employeeId: 'e1',
        at: '2026-10-01T03:42:00Z',
        time: '09:12',
        direction: 'IN',
        source: 'BIOMETRIC_APP',
        distanceMetres: 12.4,
        flags: ['RECORDED_OFFLINE'],
        deviceModel: 'Redmi Note 11',
      },
      {
        id: 'p2',
        employeeId: 'e1',
        at: '2026-10-01T03:44:00Z',
        time: '09:14',
        direction: 'IN',
        source: 'BIOMETRIC_APP',
        flags: ['FAKE_LOCATION'],
        counted: false,
        deviceModel: 'Redmi Note 11',
      },
      {
        id: 'p3',
        employeeId: 'e1',
        at: '2026-10-01T13:10:00Z',
        time: '18:40',
        direction: 'OUT',
        source: 'SELF',
        distanceMetres: 310,
        flags: ['OUTSIDE_SHOP'],
      },
    ]);
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    await user.click(within(table).getByRole('button', { name: /Asha, Thu, 1 Oct/ }));

    const list = await screen.findByRole('list', { name: 'Check-ins on this day' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(within(items[0]).getByText('09:12 · In')).toBeInTheDocument();
    expect(within(items[0]).getByText('Attendance app')).toBeInTheDocument();
    expect(items[0].querySelector('[data-source="APP"]')).not.toBeNull();
    expect(
      within(items[0]).getByText('12 m from shop · Recorded offline · Redmi Note 11'),
    ).toBeInTheDocument();
    expect(items[0]).toHaveAttribute('data-counted', 'true');

    // A duplicate is listed, greyed out, with "—" for its missing distance and every flag.
    expect(within(items[1]).getByText('09:14 · In')).toBeInTheDocument();
    expect(
      within(items[1]).getByText(
        '— · Fake location · Redmi Note 11 · Not counted (within 5 minutes of the last one)',
      ),
    ).toBeInTheDocument();
    expect(items[1]).toHaveAttribute('data-counted', 'false');
    expect(items[1].className).toMatch(/hrPunchDuplicate/);

    // My HR punch: phone icon and label, no phone model.
    expect(within(items[2]).getByText('My HR')).toBeInTheDocument();
    expect(items[2].querySelector('[data-source="PHONE"]')).not.toBeNull();
    expect(within(items[2]).getByText('310 m from shop · Outside shop')).toBeInTheDocument();
    expect(within(items[2]).queryByText(/Redmi/)).toBeNull();
  });
});

describe('register filters (R8.10–R8.11)', () => {
  const HAND = row({
    employeeId: 'e1',
    name: 'Asha',
    status: 'PRESENT',
    source: 'MARK',
    markSource: 'MANUAL',
  });
  const PHONE = row({
    employeeId: 'e2',
    name: 'Ravi',
    status: 'PRESENT',
    source: 'MARK',
    markSource: 'SELF_CHECK_IN',
    punchSource: 'SELF',
    missingCheckOut: true,
  });
  const APP = row({
    employeeId: 'e3',
    name: 'Meena',
    status: 'PRESENT',
    source: 'MARK',
    markSource: 'BIOMETRIC_APP',
    punchSource: 'BIOMETRIC_APP',
  });
  const NONE = row({ employeeId: 'e4', name: 'Sunil' });

  it('Source narrows the daily register, several sources add up, and Flagged ANDs with it', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [HAND, PHONE, APP, NONE] }));
    renderAt('/dashboard/hr/attendance');

    const list = await screen.findByRole('list', { name: /Attendance on/ });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: /^Source/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Attendance app' }));
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Meena']);
    expect(screen.getByText('1 of 4 shown')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'My HR' }));
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Ravi', 'Meena']);

    // Flagged: only Ravi shows a chip (Missing check-out).
    await user.click(screen.getByRole('checkbox', { name: 'Flagged' }));
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Ravi']);

    // Removing the Source filter keeps Flagged on its own.
    await user.click(screen.getByRole('button', { name: 'Remove Source filter' }));
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Ravi']);
    await user.click(screen.getByRole('checkbox', { name: 'Flagged' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText(/of 4 shown/)).toBeNull();
  });

  it('Source AND Flagged stay on across the existing date filter and apply to the new day’s rows', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    // Today: Ravi (My HR, Missing check-out) is the only flagged phone/app day. Yesterday: an
    // app day flagged Fake location for Sunil and an unflagged My HR day for Asha.
    const today = todayIso();
    const yesterdayRows = [
      row({ ...PHONE, employeeId: 'e1', name: 'Asha', missingCheckOut: false }),
      row({ ...APP, employeeId: 'e4', name: 'Sunil', flags: ['FAKE_LOCATION'] }),
    ];
    attendanceApi.daily.mockImplementation(async (date: string) =>
      date === today
        ? register({ date, rows: [HAND, PHONE, APP, NONE] })
        : register({ date, rows: yesterdayRows }),
    );
    renderAt('/dashboard/hr/attendance');

    const names = () =>
      within(screen.getByRole('list', { name: /Attendance on/ }))
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label'));

    await screen.findByRole('list', { name: /Attendance on/ });
    await user.click(screen.getByRole('button', { name: /^Source/ }));
    await user.click(screen.getByRole('checkbox', { name: 'My HR' }));
    await user.click(screen.getByRole('checkbox', { name: 'Attendance app' }));
    await user.click(screen.getByRole('checkbox', { name: 'Flagged' }));
    expect(names()).toEqual(['Ravi']);

    // Step the date: the register reloads for yesterday and the same Source + Flagged filters
    // apply to those rows — AND with the existing date filter (R8.11).
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    await waitFor(() => expect(attendanceApi.daily).toHaveBeenCalledTimes(2));
    expect(attendanceApi.daily.mock.calls[1][0]).not.toBe(today);
    await waitFor(() => expect(names()).toEqual(['Sunil']));
    expect(screen.getByText('1 of 2 shown')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Flagged' })).toBeChecked();

    // Flagged off: Asha’s unflagged My HR day comes back; Source still rules out nobody else.
    await user.click(screen.getByRole('checkbox', { name: 'Flagged' }));
    expect(names()).toEqual(['Asha', 'Sunil']);
  });

  it('says so when no row matches', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.daily.mockResolvedValue(register({ rows: [HAND, NONE] }));
    renderAt('/dashboard/hr/attendance');

    await screen.findByRole('list', { name: /Attendance on/ });
    await user.click(screen.getByRole('button', { name: /^Source/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Attendance app' }));
    expect(screen.getByText('No employee matches these filters on this day.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Asha' })).toBeNull();
  });

  it('the month register has Source but no Flagged, and keeps employees with a matching day', async () => {
    const user = userEvent.setup();
    signIn(['VIEW_ATTENDANCE']);
    attendanceApi.month.mockResolvedValue({
      ...MONTH,
      rows: [
        MONTH.rows[0],
        {
          ...MONTH.rows[0],
          employeeId: 'e2',
          code: 'EMP-002',
          name: 'Ravi',
          cells: [
            { status: 'PRESENT', markSource: 'BIOMETRIC_APP' },
            { status: 'ABSENT' },
            { status: 'UNMARKED' },
          ],
        },
      ],
    });
    renderAt('/dashboard/hr/attendance/month');

    const table = await screen.findByRole('table', { name: /Attendance register/ });
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.queryByRole('checkbox', { name: 'Flagged' })).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Source/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Attendance app' }));
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByRole('row', { name: /Ravi/ })).toBeInTheDocument();
    expect(within(table).queryByRole('row', { name: /Asha/ })).toBeNull();
    expect(screen.getByText('1 of 2 shown')).toBeInTheDocument();

    // Hand: both employees have a hand mark (Asha's Present, Ravi's Absent).
    await user.click(screen.getByRole('checkbox', { name: 'Hand' }));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });
});
