// Run F5: every HR file and payment call goes to the backend path it mirrors
// (`PayrollController`, `HrReportController`, `HrSelfServiceController`).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attendanceApi } from './attendance.api';
import { leaveApi } from './leave.api';
import { meApi } from './me.api';
import { payrollApi } from './payroll.api';

const files = vi.hoisted(() => ({ downloadHrBlob: vi.fn() }));
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('./download', () => files);
vi.mock('@inventory-platform/api-client', () => ({ apiClient: client }));

beforeEach(() => {
  vi.clearAllMocks();
  files.downloadHrBlob.mockResolvedValue({ blob: new Blob(['x']), filename: 'f' });
  client.post.mockResolvedValue({ data: {} });
  client.get.mockResolvedValue({ data: [] });
});

describe('HR file downloads', () => {
  it('payslip of one line', async () => {
    await payrollApi.payslipPdf('run 1', 'l1');
    expect(files.downloadHrBlob).toHaveBeenCalledWith(
      '/hr/payroll-runs/run%201/lines/l1/payslip',
      undefined,
      'payslip.pdf',
    );
  });

  it('salary register as Excel or PDF', async () => {
    await payrollApi.register('r1', 'xlsx');
    await payrollApi.register('r1', 'pdf');
    expect(files.downloadHrBlob).toHaveBeenNthCalledWith(
      1,
      '/hr/payroll-runs/r1/register',
      { format: 'xlsx' },
      'salary-register.xlsx',
    );
    expect(files.downloadHrBlob).toHaveBeenNthCalledWith(
      2,
      '/hr/payroll-runs/r1/register',
      { format: 'pdf' },
      'salary-register.pdf',
    );
  });

  it('month attendance and leave balance exports', async () => {
    await attendanceApi.monthExport('2026-10');
    await leaveApi.balancesExport('2026-27');
    expect(files.downloadHrBlob).toHaveBeenCalledWith(
      '/hr/attendance/month/export',
      { period: '2026-10' },
      'attendance-2026-10.xlsx',
    );
    expect(files.downloadHrBlob).toHaveBeenCalledWith(
      '/hr/leave-balances/export',
      { year: '2026-27' },
      'leave-balances-2026-27.xlsx',
    );
  });

  it('own payslip from My HR', async () => {
    await meApi.payslipPdf('l9');
    expect(files.downloadHrBlob).toHaveBeenCalledWith(
      '/hr/me/payslips/l9/pdf',
      undefined,
      'payslip.pdf',
    );
  });
});

describe('payments and payslip email', () => {
  it('posts payments, undo and email to the run', async () => {
    const body = { lineIds: [], all: true, date: '2026-10-05', method: 'CASH' as const };
    await payrollApi.pay('r1', body);
    await payrollApi.undoPayment('r1', 'l1', 'Paid twice');
    await payrollApi.emailPayslips('r1', { lineIds: ['l1'] });
    expect(client.post).toHaveBeenNthCalledWith(1, '/hr/payroll-runs/r1/payments', body);
    expect(client.post).toHaveBeenNthCalledWith(2, '/hr/payroll-runs/r1/lines/l1/payment/undo', {
      reason: 'Paid twice',
    });
    expect(client.post).toHaveBeenNthCalledWith(3, '/hr/payroll-runs/r1/payslips/email', {
      lineIds: ['l1'],
    });
  });

  it('filters balances by employee and polls notifications from the cursor', async () => {
    await leaveApi.balances(undefined, 'e1');
    client.get.mockResolvedValueOnce({ data: { items: [], cursor: null } });
    await meApi.notifications('2026-10-01T10:00:00Z');
    expect(client.get).toHaveBeenNthCalledWith(1, '/hr/leave-balances', { employeeId: 'e1' });
    expect(client.get).toHaveBeenNthCalledWith(2, '/hr/me/notifications', {
      since: '2026-10-01T10:00:00Z',
    });
  });
});
