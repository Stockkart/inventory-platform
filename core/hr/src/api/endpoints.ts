/**
 * HR REST paths (relative to the api-client base, i.e. without `/api/v1`).
 * Settings, holidays, leave types, role grid, setup status, employees and linkable logins are
 * here (task 13.2); attendance and leave since run F3; advances and payroll (runs, adjustments,
 * finalise, reopen) since run F4; payments, payslips, registers, exports and `/me` since run F5.
 */
export const HR_ENDPOINTS = {
  BASE: '/hr',
  SETTINGS: '/hr/settings',
  SETUP_STATUS: '/hr/setup-status',
  ROLE_PERMISSIONS: '/hr/role-permissions',
  HOLIDAYS: '/hr/holidays',
  HOLIDAY_BY_ID: (id: string) => `/hr/holidays/${encodeURIComponent(id)}`,
  LEAVE_TYPES: '/hr/leave-types',
  LEAVE_TYPE_BY_ID: (id: string) => `/hr/leave-types/${encodeURIComponent(id)}`,
  EMPLOYEES: '/hr/employees',
  EMPLOYEE_DESIGNATIONS: '/hr/employees/designations',
  EMPLOYEE_BY_ID: (id: string) => `/hr/employees/${encodeURIComponent(id)}`,
  EMPLOYEE_SALARY_REVISIONS: (id: string) =>
    `/hr/employees/${encodeURIComponent(id)}/salary-revisions`,
  EMPLOYEE_EXIT: (id: string) => `/hr/employees/${encodeURIComponent(id)}/exit`,
  LINKABLE_LOGINS: '/hr/linkable-logins',
  ATTENDANCE_DAILY: '/hr/attendance/daily',
  ATTENDANCE_DAYS: '/hr/attendance/days',
  ATTENDANCE_MARK_UNMARKED_PRESENT: '/hr/attendance/mark-unmarked-present',
  ATTENDANCE_MONTH: '/hr/attendance/month',
  ATTENDANCE_HISTORY: '/hr/attendance/history',
  // Attendance capture: punches and self check-in.
  ATTENDANCE_PUNCHES: '/hr/attendance/punches',
  LEAVE_REQUESTS: '/hr/leave-requests',
  LEAVE_PREVIEW: '/hr/leave-requests/preview',
  LEAVE_DECISION: (id: string, decision: 'approve' | 'reject' | 'cancel') =>
    `/hr/leave-requests/${encodeURIComponent(id)}/${decision}`,
  LEAVE_BALANCES: '/hr/leave-balances',
  // Run F4: advances and payroll (`AdvanceController`, `PayrollController`).
  ADVANCES: '/hr/advances',
  ADVANCE_CANCEL: (id: string) => `/hr/advances/${encodeURIComponent(id)}/cancel`,
  EMPLOYEE_ADVANCE_STATEMENT: (id: string) =>
    `/hr/employees/${encodeURIComponent(id)}/advance-statement`,
  PAYROLL_RUNS: '/hr/payroll-runs',
  PAYROLL_RUN: (runId: string) => `/hr/payroll-runs/${encodeURIComponent(runId)}`,
  PAYROLL_RUN_ACTION: (runId: string, action: 'recalculate' | 'finalise' | 'reopen' | 'unmarked') =>
    `/hr/payroll-runs/${encodeURIComponent(runId)}/${action}`,
  PAYROLL_LINE_ADJUSTMENTS: (runId: string, lineId: string) =>
    `/hr/payroll-runs/${encodeURIComponent(runId)}/lines/${encodeURIComponent(lineId)}/adjustments`,
  // Run F5: payments, payslips, registers (`PayrollController`, `HrReportController`).
  PAYROLL_PAYMENTS: (runId: string) => `/hr/payroll-runs/${encodeURIComponent(runId)}/payments`,
  PAYROLL_PAYMENT_UNDO: (runId: string, lineId: string) =>
    `/hr/payroll-runs/${encodeURIComponent(runId)}/lines/${encodeURIComponent(
      lineId,
    )}/payment/undo`,
  PAYROLL_PAYSLIP: (runId: string, lineId: string) =>
    `/hr/payroll-runs/${encodeURIComponent(runId)}/lines/${encodeURIComponent(lineId)}/payslip`,
  PAYROLL_PAYSLIPS_EMAIL: (runId: string) =>
    `/hr/payroll-runs/${encodeURIComponent(runId)}/payslips/email`,
  PAYROLL_REGISTER: (runId: string) => `/hr/payroll-runs/${encodeURIComponent(runId)}/register`,
  ATTENDANCE_MONTH_EXPORT: '/hr/attendance/month/export',
  LEAVE_BALANCES_EXPORT: '/hr/leave-balances/export',
  // Run F5: self-service (`HrSelfServiceController`); the server resolves the caller's employee.
  ME: '/hr/me',
  ME_ATTENDANCE: '/hr/me/attendance',
  ME_LEAVE: '/hr/me/leave',
  ME_LEAVE_PREVIEW: '/hr/me/leave/preview',
  ME_LEAVE_REQUESTS: '/hr/me/leave-requests',
  ME_LEAVE_CANCEL: (id: string) => `/hr/me/leave-requests/${encodeURIComponent(id)}/cancel`,
  ME_PAYSLIPS: '/hr/me/payslips',
  ME_CHECK_IN: '/hr/me/check-in',
  ME_PUNCHES: '/hr/me/punches',
  ME_PAYSLIP_PDF: (lineId: string) => `/hr/me/payslips/${encodeURIComponent(lineId)}/pdf`,
  ME_NOTIFICATIONS: '/hr/me/notifications',
  ME_NOTIFICATION_READ: (id: string) => `/hr/me/notifications/${encodeURIComponent(id)}/read`,
  ME_NOTIFICATIONS_READ_ALL: '/hr/me/notifications/read-all',
} as const;
