import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuthStore, useShopAccessStore } from '@inventory-platform/session';
import {
  MAX_ATTENDANCE_ROWS,
  MAX_PAYSLIP_EMAIL_LINES,
  chunkRows,
  type AdvanceResponse,
  type AttendanceRowResponse,
  type PayrollLineResponse,
  type PayrollRunResponse,
  type RecordAdvanceRequest,
  type SavePayrollAdjustmentsRequest,
  type LeaveDecision,
  type LeavePreviewParams,
  type LeaveRequestListParams,
  type LeaveRequestResponse,
  type MarkUnmarkedPresentRequest,
  type MarkUnmarkedPresentResponse,
  type RecordLeaveRequest,
  type SaveAttendanceDayRow,
  type EmailPayslipsResponse,
  type HrNotificationResponse,
  type MyLeavePreviewParams,
  type RecordSalaryPaymentsRequest,
  type RequestLeaveRequest,
  type SalaryPaymentsResponse,
} from '@inventory-platform/hr/types';
import type {
  AddSalaryRevisionRequest,
  EmployeeListParams,
  EmployeeResponse,
  ExitEmployeeRequest,
  HolidayResponse,
  HrRolePermissionsResponse,
  HrSettingsResponse,
  LeaveTypeResponse,
  SaveEmployeeRequest,
  SaveHolidayRequest,
  SaveLeaveTypeRequest,
  UpdateHrRolePermissionsRequest,
  UpdateHrSettingsRequest,
} from '@inventory-platform/hr/types';
import { advancesApi } from '../api/advances.api';
import { attendanceApi } from '../api/attendance.api';
import { employeesApi } from '../api/employees.api';
import { leaveApi } from '../api/leave.api';
import { meApi } from '../api/me.api';
import { payrollApi } from '../api/payroll.api';
import { hrSettingsApi } from '../api/settings.api';
import { hrKeys } from './keys';

/** Active shop of the signed-in user; HR queries stay disabled until it is known. */
export function useHrShopId(): string {
  return useAuthStore((s) => s.user?.shopId ?? '');
}

/** Every HR write can change setup status, lists and details, so refresh the shop's HR tree. */
function invalidateShop(queryClient: QueryClient, shopId: string) {
  return queryClient.invalidateQueries({ queryKey: hrKeys.shop(shopId) });
}

// ---- settings ----

export function useHrSettingsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.settings(shopId),
    queryFn: () => hrSettingsApi.getSettings(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useUpdateHrSettingsMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<HrSettingsResponse, Error, UpdateHrSettingsRequest>({
    mutationFn: (body) => hrSettingsApi.updateSettings(body),
    onSuccess: (saved) => {
      // Put the fresh revision in the cache right away so a quick second save is not stale.
      queryClient.setQueryData(hrKeys.settings(shopId), saved);
      void invalidateShop(queryClient, shopId);
    },
  });
}

export function useHrSetupStatusQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.setupStatus(shopId),
    queryFn: () => hrSettingsApi.getSetupStatus(),
    enabled: Boolean(shopId) && enabled,
  });
}

// ---- role grid (owner only) ----

export function useHrRolePermissionsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.rolePermissions(shopId),
    queryFn: () => hrSettingsApi.getRolePermissions(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useUpdateHrRolePermissionsMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<HrRolePermissionsResponse, Error, UpdateHrRolePermissionsRequest>({
    mutationFn: (body) => hrSettingsApi.updateRolePermissions(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(hrKeys.rolePermissions(shopId), saved);
      void invalidateShop(queryClient, shopId);
      // The grid feeds `/shops/me/access` (nav, buttons), so reload it through the session store.
      void useShopAccessStore.getState().fetchAccess({ force: true });
    },
  });
}

// ---- holidays ----

export function useHolidaysQuery(year: number, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.holidays(shopId, year),
    queryFn: () => hrSettingsApi.listHolidays(year),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useSaveHolidayMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<HolidayResponse, Error, { id?: string; body: SaveHolidayRequest }>({
    mutationFn: ({ id, body }) =>
      id ? hrSettingsApi.updateHoliday(id, body) : hrSettingsApi.createHoliday(body),
    onSuccess: () => void invalidateShop(queryClient, shopId),
  });
}

export function useDeleteHolidayMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => hrSettingsApi.deleteHoliday(id),
    onSuccess: () => void invalidateShop(queryClient, shopId),
  });
}

// ---- leave types ----

export function useLeaveTypesQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.leaveTypes(shopId),
    queryFn: () => hrSettingsApi.listLeaveTypes(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useSaveLeaveTypeMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<LeaveTypeResponse, Error, { id?: string; body: SaveLeaveTypeRequest }>({
    mutationFn: ({ id, body }) =>
      id ? hrSettingsApi.updateLeaveType(id, body) : hrSettingsApi.createLeaveType(body),
    onSuccess: () => void invalidateShop(queryClient, shopId),
  });
}

// ---- employees ----

export function useEmployeesQuery(params: EmployeeListParams, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.employeeList(shopId, params),
    queryFn: () => employeesApi.list(params),
    enabled: Boolean(shopId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeDesignationsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.designations(shopId),
    queryFn: () => employeesApi.designations(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useEmployeeQuery(id: string | undefined) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.employee(shopId, id ?? ''),
    // `enabled` guarantees an id here; the fallback only satisfies the type.
    queryFn: () => employeesApi.get(id ?? ''),
    enabled: Boolean(shopId) && Boolean(id),
  });
}

export function useLinkableLoginsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.linkableLogins(shopId),
    queryFn: () => employeesApi.linkableLogins(),
    enabled: Boolean(shopId) && enabled,
  });
}

/** Page size cap of `GET /employees`. */
const EMPLOYEE_PAGE_MAX = 100;
/** 1,000 active employees max (backend cap) plus exited ones; stop after this many pages. */
const EMPLOYEE_OPTION_PAGES = 20;

/**
 * Every employee (active and exited) for pickers, read 100 at a time. VIEW_EMPLOYEES; advances and
 * payroll users always have it (backend `HrPermission.requires`).
 */
export function useEmployeeOptionsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.employeeOptions(shopId),
    queryFn: async () => {
      const all: EmployeeResponse[] = [];
      for (let page = 0; page < EMPLOYEE_OPTION_PAGES; page += 1) {
        const res = await employeesApi.list({ page, size: EMPLOYEE_PAGE_MAX });
        all.push(...res.items);
        if (page + 1 >= res.page.totalPages) break;
      }
      return all;
    },
    enabled: Boolean(shopId) && enabled,
    staleTime: 60_000,
  });
}

/** After a write, seed the detail cache with the server copy (fresh `revision`), then refresh. */
function onEmployeeSaved(queryClient: QueryClient, shopId: string, saved: EmployeeResponse) {
  queryClient.setQueryData(hrKeys.employee(shopId, saved.id), saved);
  void invalidateShop(queryClient, shopId);
}

export function useCreateEmployeeMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<EmployeeResponse, Error, SaveEmployeeRequest>({
    mutationFn: (body) => employeesApi.create(body),
    onSuccess: (saved) => onEmployeeSaved(queryClient, shopId, saved),
  });
}

export function useUpdateEmployeeMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<EmployeeResponse, Error, { id: string; body: SaveEmployeeRequest }>({
    mutationFn: ({ id, body }) => employeesApi.update(id, body),
    onSuccess: (saved) => onEmployeeSaved(queryClient, shopId, saved),
  });
}

export function useAddSalaryRevisionMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<EmployeeResponse, Error, { id: string; body: AddSalaryRevisionRequest }>({
    mutationFn: ({ id, body }) => employeesApi.addSalaryRevision(id, body),
    onSuccess: (saved) => onEmployeeSaved(queryClient, shopId, saved),
  });
}

export function useExitEmployeeMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<EmployeeResponse, Error, { id: string; body: ExitEmployeeRequest }>({
    mutationFn: ({ id, body }) => employeesApi.exit(id, body),
    onSuccess: (saved) => onEmployeeSaved(queryClient, shopId, saved),
  });
}

// ---- attendance ----

/**
 * Attendance writes change registers, history and the get-started guide (`attendanceMarked`);
 * leave balances are not affected by marks.
 * Run F4: they also change draft payroll (paid days, the unmarked list that blocks finalise),
 * so the payroll sub-tree is refreshed too.
 */
function invalidateAttendance(queryClient: QueryClient, shopId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hrKeys.attendance(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.setupStatus(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.payroll(shopId) }),
    // A marker may be marking their own day (run F5: My HR shows it).
    queryClient.invalidateQueries({ queryKey: hrKeys.me(shopId) }),
  ]);
}

/** Leave writes change requests, previews, balances and the days shown as Leave. */
function invalidateLeave(queryClient: QueryClient, shopId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hrKeys.leave(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.attendance(shopId) }),
    // Paid/unpaid leave days feed draft payroll (run F4).
    queryClient.invalidateQueries({ queryKey: hrKeys.payroll(shopId) }),
    // Own requests and balances in My HR (run F5).
    queryClient.invalidateQueries({ queryKey: hrKeys.me(shopId) }),
  ]);
}

export function useDailyRegisterQuery(date: string, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.attendanceDaily(shopId, date),
    queryFn: () => attendanceApi.daily(date),
    enabled: Boolean(shopId) && Boolean(date) && enabled,
  });
}

export function useMonthRegisterQuery(period: string, employeeId?: string, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.attendanceMonth(shopId, period, employeeId ?? null),
    queryFn: () => attendanceApi.month(period, employeeId),
    enabled: Boolean(shopId) && Boolean(period) && enabled,
    placeholderData: keepPreviousData,
  });
}

/** MARK_ATTENDANCE only; pass `enabled=false` otherwise (the server answers 403). */
export function useAttendanceHistoryQuery(
  employeeId: string | undefined,
  date: string | undefined,
  enabled = true,
) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.attendanceHistory(shopId, employeeId ?? '', date ?? ''),
    queryFn: () => attendanceApi.history(employeeId ?? '', date ?? ''),
    enabled: Boolean(shopId) && Boolean(employeeId) && Boolean(date) && enabled,
  });
}

/**
 * Saves changed rows. More than 500 rows are sent in several calls, one after another, so a
 * failure leaves earlier chunks saved; the caller refetches either way.
 */
export function useSaveAttendanceDaysMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<AttendanceRowResponse[], Error, SaveAttendanceDayRow[]>({
    mutationFn: async (rows) => {
      const saved: AttendanceRowResponse[] = [];
      for (const chunk of chunkRows(rows, MAX_ATTENDANCE_ROWS)) {
        saved.push(...(await attendanceApi.saveDays({ rows: chunk })));
      }
      return saved;
    },
    onSettled: () => void invalidateAttendance(queryClient, shopId),
  });
}

export function useMarkUnmarkedPresentMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<MarkUnmarkedPresentResponse, Error, MarkUnmarkedPresentRequest>({
    mutationFn: (body) => attendanceApi.markUnmarkedPresent(body),
    onSuccess: () => void invalidateAttendance(queryClient, shopId),
  });
}

// ---- leave ----

export function useLeaveRequestsQuery(params: LeaveRequestListParams, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.leaveRequests(shopId, params),
    queryFn: () => leaveApi.list(params),
    enabled: Boolean(shopId) && enabled,
    placeholderData: keepPreviousData,
  });
}

/** `params` null = form not complete yet. MARK_ATTENDANCE only. */
export function useLeavePreviewQuery(params: LeavePreviewParams | null, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.leavePreview(
      shopId,
      params ?? { employeeId: '', leaveTypeId: '', from: '', to: '' },
    ),
    // `enabled` guarantees params here; the fallback only satisfies the type.
    queryFn: () =>
      leaveApi.preview(params ?? { employeeId: '', leaveTypeId: '', from: '', to: '' }),
    enabled: Boolean(shopId) && params != null && enabled,
    retry: false,
  });
}

/** `employeeId` set = that employee only (server filter since run B4). */
export function useLeaveBalancesQuery(
  year: string | null,
  enabled = true,
  employeeId: string | null = null,
) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.leaveBalances(shopId, year, employeeId),
    queryFn: () =>
      employeeId
        ? leaveApi.balances(year ?? undefined, employeeId)
        : leaveApi.balances(year ?? undefined),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useRecordLeaveMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<LeaveRequestResponse, Error, RecordLeaveRequest>({
    mutationFn: (body) => leaveApi.record(body),
    onSuccess: () => void invalidateLeave(queryClient, shopId),
  });
}

export function useLeaveDecisionMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<
    LeaveRequestResponse,
    Error,
    { id: string; decision: LeaveDecision; note?: string }
  >({
    mutationFn: ({ id, decision, note }) =>
      leaveApi.decide(id, decision, { note: note?.trim() ? note.trim() : null }),
    onSuccess: () => void invalidateLeave(queryClient, shopId),
  });
}

// ---- advances (run F4) ----

/** Advance writes change lists, statements and the automatic recovery in draft payroll. */
function invalidateAdvances(queryClient: QueryClient, shopId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hrKeys.advances(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.payroll(shopId) }),
  ]);
}

/** `employeeId` null = the shop's newest 500. MANAGE_ADVANCES. */
export function useAdvancesQuery(employeeId: string | null, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.advanceList(shopId, employeeId),
    queryFn: () => advancesApi.list(employeeId ?? undefined),
    enabled: Boolean(shopId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAdvanceStatementQuery(employeeId: string | null | undefined, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.advanceStatement(shopId, employeeId ?? ''),
    // `enabled` guarantees an id here; the fallback only satisfies the type.
    queryFn: () => advancesApi.statement(employeeId ?? ''),
    enabled: Boolean(shopId) && Boolean(employeeId) && enabled,
  });
}

export function useRecordAdvanceMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<AdvanceResponse, Error, RecordAdvanceRequest>({
    mutationFn: (body) => advancesApi.record(body),
    onSuccess: () => void invalidateAdvances(queryClient, shopId),
  });
}

export function useCancelAdvanceMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<AdvanceResponse, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => advancesApi.cancel(id, reason.trim()),
    // A refusal (already recovered, payroll being finalised) may mean the list is stale too.
    onSettled: () => void invalidateAdvances(queryClient, shopId),
  });
}

// ---- payroll (run F4) ----

/**
 * Payroll writes change runs and lines, the month's attendance lock (finalise/reopen) and what
 * is still owed on advances (recoveries count once a run is finalised).
 */
function invalidatePayroll(queryClient: QueryClient, shopId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hrKeys.payroll(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.attendance(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.advances(shopId) }),
    // Finalise/reopen add or remove payslips; payments change their status (run F5).
    queryClient.invalidateQueries({ queryKey: hrKeys.me(shopId) }),
  ]);
}

/** Put the run the server sent back (with lines) in the cache, then refresh around it. */
function onRunSaved(queryClient: QueryClient, shopId: string, run: PayrollRunResponse) {
  queryClient.setQueryData(hrKeys.payrollRun(shopId, run.id), run);
  void invalidatePayroll(queryClient, shopId);
}

/** RUN_PAYROLL or RECORD_PAYMENTS. */
export function usePayrollRunsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.payrollRuns(shopId),
    queryFn: () => payrollApi.list(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function usePayrollRunQuery(runId: string | undefined, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.payrollRun(shopId, runId ?? ''),
    // `enabled` guarantees an id here; the fallback only satisfies the type.
    queryFn: () => payrollApi.get(runId ?? ''),
    enabled: Boolean(shopId) && Boolean(runId) && enabled,
  });
}

/** Read on demand before finalising; `enabled` false keeps it from loading with the page. */
export function usePayrollUnmarkedQuery(runId: string | undefined, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.payrollUnmarked(shopId, runId ?? ''),
    queryFn: () => payrollApi.unmarked(runId ?? ''),
    enabled: Boolean(shopId) && Boolean(runId) && enabled,
  });
}

/** Imperative unmarked read (always fresh) for the finalise flow. */
export function useFetchPayrollUnmarked() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return (runId: string) =>
    queryClient.fetchQuery({
      queryKey: hrKeys.payrollUnmarked(shopId, runId),
      queryFn: () => payrollApi.unmarked(runId),
      staleTime: 0,
    });
}

/** POST answers the month's existing run when there is one (one run per month). */
export function useCreatePayrollRunMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<PayrollRunResponse, Error, string>({
    mutationFn: (period) => payrollApi.create(period),
    onSuccess: (run) => onRunSaved(queryClient, shopId, run),
  });
}

export function useRecalculatePayrollMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<PayrollRunResponse, Error, string>({
    mutationFn: (runId) => payrollApi.recalculate(runId),
    onSuccess: (run) => onRunSaved(queryClient, shopId, run),
  });
}

export function useSavePayrollAdjustmentsMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<
    PayrollLineResponse,
    Error,
    { runId: string; lineId: string; body: SavePayrollAdjustmentsRequest }
  >({
    mutationFn: ({ runId, lineId, body }) => payrollApi.saveAdjustments(runId, lineId, body),
    onSuccess: (line) => {
      // Swap the saved line in at once; the run totals arrive with the refetch below.
      queryClient.setQueryData<PayrollRunResponse>(hrKeys.payrollRun(shopId, line.runId), (run) =>
        run ? { ...run, lines: (run.lines ?? []).map((l) => (l.id === line.id ? line : l)) } : run,
      );
      void invalidatePayroll(queryClient, shopId);
    },
  });
}

export function useFinalisePayrollMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<PayrollRunResponse, Error, string>({
    mutationFn: (runId) => payrollApi.finalise(runId),
    onSuccess: (run) => queryClient.setQueryData(hrKeys.payrollRun(shopId, run.id), run),
    // Refetch on failure as well: a 409 "changed while finalising" puts the run back to draft
    // with a new revision, and the page must show that state, not the stale one.
    onSettled: () => void invalidatePayroll(queryClient, shopId),
  });
}

export function useReopenPayrollMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<PayrollRunResponse, Error, { runId: string; reason: string }>({
    mutationFn: ({ runId, reason }) => payrollApi.reopen(runId, reason.trim()),
    onSuccess: (run) => queryClient.setQueryData(hrKeys.payrollRun(shopId, run.id), run),
    onSettled: () => void invalidatePayroll(queryClient, shopId),
  });
}

// ---- payments and payslips (run F5) ----

/**
 * One payment call. The page loops it for "Pay everyone" (`payEveryoneInChunks`), so this does
 * not refresh by itself; call `useRefreshPayroll` once the loop ends.
 */
export function useRecordSalaryPaymentsMutation() {
  return useMutation<
    SalaryPaymentsResponse,
    Error,
    { runId: string; body: RecordSalaryPaymentsRequest }
  >({
    mutationFn: ({ runId, body }) => payrollApi.pay(runId, body),
  });
}

/** Refresh payroll (and what depends on payments) after a payment loop, success or not. */
export function useRefreshPayroll() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useCallback(() => invalidatePayroll(queryClient, shopId), [queryClient, shopId]);
}

export function useUndoSalaryPaymentMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<
    PayrollLineResponse,
    Error,
    { runId: string; lineId: string; reason?: string | null }
  >({
    mutationFn: ({ runId, lineId, reason }) =>
      payrollApi.undoPayment(runId, lineId, reason?.trim() ? reason.trim() : null),
    onSuccess: (line) => {
      // Show the line as pending at once; the refetch below brings everything else.
      queryClient.setQueryData<PayrollRunResponse>(hrKeys.payrollRun(shopId, line.runId), (run) =>
        run ? { ...run, lines: (run.lines ?? []).map((l) => (l.id === line.id ? line : l)) } : run,
      );
    },
    // A refusal ("being paid by someone else") may mean the cached line is stale too.
    onSettled: () => void invalidatePayroll(queryClient, shopId),
  });
}

/** Queues payslip emails, ≤ 300 lines per call, one call after another. */
export function useEmailPayslipsMutation() {
  return useMutation<EmailPayslipsResponse, Error, { runId: string; lineIds: string[] }>({
    mutationFn: async ({ runId, lineIds }) => {
      const total: EmailPayslipsResponse = { queued: 0, skippedNoEmail: [] };
      for (let i = 0; i < lineIds.length; i += MAX_PAYSLIP_EMAIL_LINES) {
        const res = await payrollApi.emailPayslips(runId, {
          lineIds: lineIds.slice(i, i + MAX_PAYSLIP_EMAIL_LINES),
        });
        total.queued += res.queued ?? 0;
        total.skippedNoEmail.push(...(res.skippedNoEmail ?? []));
      }
      return total;
    },
  });
}

// ---- self-service: My HR (run F5) ----

/** Own data only; `enabled` should follow `useHrAccess().employeeId` (404 when not linked). */
export function useMyProfileQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.meProfile(shopId),
    queryFn: () => meApi.profile(),
    enabled: Boolean(shopId) && enabled,
  });
}

export function useMyAttendanceQuery(period: string, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.meAttendance(shopId, period),
    queryFn: () => meApi.attendance(period),
    enabled: Boolean(shopId) && Boolean(period) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMyLeaveQuery(year: string | null, enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.meLeave(shopId, year),
    queryFn: () => meApi.leave(year ?? undefined),
    enabled: Boolean(shopId) && enabled,
  });
}

/** `params` null = form not complete yet. */
export function useMyLeavePreviewQuery(params: MyLeavePreviewParams | null, enabled = true) {
  const shopId = useHrShopId();
  const empty: MyLeavePreviewParams = { leaveTypeId: '', from: '', to: '' };
  return useQuery({
    queryKey: hrKeys.meLeavePreview(shopId, params ?? empty),
    // `enabled` guarantees params here; the fallback only satisfies the type.
    queryFn: () => meApi.previewLeave(params ?? empty),
    enabled: Boolean(shopId) && params != null && enabled,
    retry: false,
  });
}

export function useMyPayslipsQuery(enabled = true) {
  const shopId = useHrShopId();
  return useQuery({
    queryKey: hrKeys.mePayslips(shopId),
    queryFn: () => meApi.payslips(),
    enabled: Boolean(shopId) && enabled,
  });
}

/** Own leave writes change My HR and the staff leave screens (an approver may be looking). */
function invalidateMyLeave(queryClient: QueryClient, shopId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: hrKeys.me(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.leave(shopId) }),
    queryClient.invalidateQueries({ queryKey: hrKeys.attendance(shopId) }),
  ]);
}

export function useRequestLeaveMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<LeaveRequestResponse, Error, RequestLeaveRequest>({
    mutationFn: (body) => meApi.requestLeave(body),
    onSuccess: () => void invalidateMyLeave(queryClient, shopId),
  });
}

export function useCancelMyLeaveMutation() {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  return useMutation<LeaveRequestResponse, Error, string>({
    mutationFn: (id) => meApi.cancelLeave(id),
    onSettled: () => void invalidateMyLeave(queryClient, shopId),
  });
}

// ---- notifications inbox (run F5) ----

/** Poll every 60 s while an HR page is open, and on window focus (design D11). */
export const HR_INBOX_POLL_MS = 60_000;
/** Rows kept on screen; older ones drop off (the server keeps them 90 days). */
const HR_INBOX_KEEP = 50;

/** What the inbox query holds: every row seen so far, newest first, and the cursor to poll from. */
export interface HrInboxData {
  items: HrNotificationResponse[];
  cursor: string | null;
}

function byNewest(a: HrNotificationResponse, b: HrNotificationResponse) {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

/**
 * The HR inbox. Each poll asks only for rows newer than the cursor the last poll returned, and
 * merges them into what is already cached (keyed by shop, so the cursor survives page changes
 * within HR). The server delivers bursts of more than 20 rows over the next polls.
 */
export function useHrInbox(enabled = true) {
  const shopId = useHrShopId();
  const queryClient = useQueryClient();
  const key = useMemo(() => hrKeys.notifications(shopId), [shopId]);

  const query = useQuery<HrInboxData>({
    queryKey: key,
    queryFn: async () => {
      const previous = queryClient.getQueryData<HrInboxData>(key);
      const res = await meApi.notifications(previous?.cursor ?? null);
      const merged = new Map((previous?.items ?? []).map((n) => [n.id, n]));
      for (const n of res.items ?? []) merged.set(n.id, n);
      return {
        items: [...merged.values()].sort(byNewest).slice(0, HR_INBOX_KEEP),
        // Keep the old cursor when the server sends none (nothing new and no `since` yet).
        cursor: res.cursor ?? previous?.cursor ?? null,
      };
    },
    enabled: Boolean(shopId) && enabled,
    refetchInterval: HR_INBOX_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Never treat the inbox as fresh, so focus always polls; polls are cheap (one indexed read).
    staleTime: 0,
    // Keep the cursor while the user moves between HR pages.
    gcTime: 30 * 60_000,
  });

  const setRead = useCallback(
    (ids: 'all' | string) =>
      queryClient.setQueryData<HrInboxData>(key, (data) =>
        data
          ? {
              ...data,
              items: data.items.map((n) =>
                ids === 'all' || n.id === ids ? { ...n, read: true } : n,
              ),
            }
          : data,
      ),
    [queryClient, key],
  );

  const markRead = useMutation<void, Error, string>({
    mutationFn: (id) => meApi.markNotificationRead(id),
    onSuccess: (_void, id) => setRead(id),
  });
  const markAllRead = useMutation<number, Error, void>({
    mutationFn: () => meApi.markAllNotificationsRead(),
    onSuccess: () => setRead('all'),
  });

  const items = query.data?.items ?? [];
  return {
    items,
    unread: items.filter((n) => !n.read).length,
    error: query.error,
    markRead,
    markAllRead,
  };
}

// ---- file downloads (run F5) ----

export interface HrDownloadState {
  /** Id of the download running now, or null. */
  pending: string | null;
  error: { id: string; message: string } | null;
  /** Runs `job` under `id`; a failure keeps the job so `retry` can run it again. */
  run: (id: string, job: () => Promise<void>) => Promise<void>;
  retry: () => void;
  dismiss: () => void;
}

/**
 * Tracks file downloads for a screen: one at a time, with the server's message on failure. The
 * heavy ones (registers, exports) may answer 503 "busy, try again" under load; the screen shows
 * that message with a "Try again" button rather than retrying by itself.
 */
export function useHrDownload(): HrDownloadState {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const last = useRef<{ id: string; job: () => Promise<void> } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (id: string, job: () => Promise<void>) => {
    last.current = { id, job };
    setError(null);
    setPending(id);
    try {
      await job();
    } catch (err) {
      if (mounted.current) {
        setError({
          id,
          message:
            err instanceof Error && err.message ? err.message : 'Could not download the file',
        });
      }
    } finally {
      if (mounted.current) setPending(null);
    }
  }, []);

  const retry = useCallback(() => {
    if (last.current) void run(last.current.id, last.current.job);
  }, [run]);
  const dismiss = useCallback(() => setError(null), []);

  return { pending, error, run, retry, dismiss };
}
