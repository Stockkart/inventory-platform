import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  EmailPayslipsRequest,
  EmailPayslipsResponse,
  PayrollLineResponse,
  PayrollRunResponse,
  RecordSalaryPaymentsRequest,
  SalaryPaymentsResponse,
  SalaryRegisterFormat,
  SavePayrollAdjustmentsRequest,
  UnmarkedDaysResponse,
} from '@inventory-platform/hr/types';
import { downloadHrBlob, type HrFile } from './download';
import { HR_ENDPOINTS } from './endpoints';

/**
 * Payroll runs (`PayrollController`). Reads need RUN_PAYROLL or RECORD_PAYMENTS, every change
 * RUN_PAYROLL. Run F5: payments (RECORD_PAYMENTS), payslip PDFs and the salary register
 * (VIEW_SALARIES), payslip email (RUN_PAYROLL); all on finalised runs only.
 */
export const payrollApi = {
  /** Runs without lines, as the server orders them. */
  list: async (): Promise<PayrollRunResponse[]> => {
    const response = await apiClient.get<ApiResponse<PayrollRunResponse[]>>(
      HR_ENDPOINTS.PAYROLL_RUNS,
    );
    return response.data ?? [];
  },

  /** Draft for the month, or the run that already exists for it (one run per month). */
  create: async (period: string): Promise<PayrollRunResponse> => {
    const response = await apiClient.post<ApiResponse<PayrollRunResponse>>(
      HR_ENDPOINTS.PAYROLL_RUNS,
      { period },
    );
    return response.data;
  },

  /** The run with its lines. */
  get: async (runId: string): Promise<PayrollRunResponse> => {
    const response = await apiClient.get<ApiResponse<PayrollRunResponse>>(
      HR_ENDPOINTS.PAYROLL_RUN(runId),
    );
    return response.data;
  },

  recalculate: async (runId: string): Promise<PayrollRunResponse> => {
    const response = await apiClient.post<ApiResponse<PayrollRunResponse>>(
      HR_ENDPOINTS.PAYROLL_RUN_ACTION(runId, 'recalculate'),
    );
    return response.data;
  },

  /** Replaces the line's manual items and this month's advance deduction (net must stay ≥ 0). */
  saveAdjustments: async (
    runId: string,
    lineId: string,
    body: SavePayrollAdjustmentsRequest,
  ): Promise<PayrollLineResponse> => {
    const response = await apiClient.put<ApiResponse<PayrollLineResponse>>(
      HR_ENDPOINTS.PAYROLL_LINE_ADJUSTMENTS(runId, lineId),
      body,
    );
    return response.data;
  },

  /** Employees with Unmarked days in the run's month; finalise needs this empty. */
  unmarked: async (runId: string): Promise<UnmarkedDaysResponse> => {
    const response = await apiClient.get<ApiResponse<UnmarkedDaysResponse>>(
      HR_ENDPOINTS.PAYROLL_RUN_ACTION(runId, 'unmarked'),
    );
    return response.data;
  },

  /**
   * Locks attendance and records the salaries in the accounts. 422 = unmarked days; 409 = order
   * rule, someone else finalising, or "changed while finalising, back to draft".
   */
  finalise: async (runId: string): Promise<PayrollRunResponse> => {
    const response = await apiClient.post<ApiResponse<PayrollRunResponse>>(
      HR_ENDPOINTS.PAYROLL_RUN_ACTION(runId, 'finalise'),
    );
    return response.data;
  },

  /** Latest finalised run only; needs a reason. Reverses the accounts entry. */
  reopen: async (runId: string, reason: string): Promise<PayrollRunResponse> => {
    const response = await apiClient.post<ApiResponse<PayrollRunResponse>>(
      HR_ENDPOINTS.PAYROLL_RUN_ACTION(runId, 'reopen'),
      { reason },
    );
    return response.data;
  },

  /**
   * One payment step: `lineIds` (≤ 50) or `all: true` (the next 50 pending lines). Lines already
   * paid or being paid by someone else come back with their status instead of failing the call.
   */
  pay: async (
    runId: string,
    body: RecordSalaryPaymentsRequest,
  ): Promise<SalaryPaymentsResponse> => {
    const response = await apiClient.post<ApiResponse<SalaryPaymentsResponse>>(
      HR_ENDPOINTS.PAYROLL_PAYMENTS(runId),
      body,
    );
    return response.data;
  },

  /** Undo one employee's payment (an opposite accounts entry for that amount only). */
  undoPayment: async (
    runId: string,
    lineId: string,
    reason?: string | null,
  ): Promise<PayrollLineResponse> => {
    const response = await apiClient.post<ApiResponse<PayrollLineResponse>>(
      HR_ENDPOINTS.PAYROLL_PAYMENT_UNDO(runId, lineId),
      { reason: reason ?? null },
    );
    return response.data;
  },

  /** Queues payslip emails (≤ 300 lines); employees without an email are listed back. */
  emailPayslips: async (
    runId: string,
    body: EmailPayslipsRequest,
  ): Promise<EmailPayslipsResponse> => {
    const response = await apiClient.post<ApiResponse<EmailPayslipsResponse>>(
      HR_ENDPOINTS.PAYROLL_PAYSLIPS_EMAIL(runId),
      body,
    );
    return response.data;
  },

  /** One payslip PDF. */
  payslipPdf: (runId: string, lineId: string): Promise<HrFile> =>
    downloadHrBlob(HR_ENDPOINTS.PAYROLL_PAYSLIP(runId, lineId), undefined, 'payslip.pdf'),

  /** Salary register of the run as Excel or PDF (may answer 503 "busy" under load). */
  register: (runId: string, format: SalaryRegisterFormat): Promise<HrFile> =>
    downloadHrBlob(HR_ENDPOINTS.PAYROLL_REGISTER(runId), { format }, `salary-register.${format}`),
};
