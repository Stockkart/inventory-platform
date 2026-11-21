import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AppHealthResponse,
  ConsentVersion,
  PairingCodeResponse,
  PairingStateResponse,
} from '@inventory-platform/hr/types';
import { HR_ENDPOINTS } from './endpoints';

/**
 * Attendance app pairing as managers and linked employees see it (`EmployeeController`,
 * `HrSelfServiceController`) plus the health alerts and consent text of `AttendanceAppController`.
 * The phone's own calls (`/hr/attendance-app/**`, signed with its device key) are not here: the
 * browser never holds a pairing key.
 */
export const pairingApi = {
  /** ADD_EDIT_EMPLOYEES: the Attendance app section of an employee's page (R2.1–R2.2). */
  state: async (employeeId: string): Promise<PairingStateResponse> => {
    const response = await apiClient.get<ApiResponse<PairingStateResponse>>(
      HR_ENDPOINTS.EMPLOYEE_PAIRING(employeeId),
    );
    return response.data;
  },

  /**
   * ADD_EDIT_EMPLOYEES: "Pair a phone". A one-time code valid 15 minutes; creating it cancels the
   * employee's previous unused code (R2.3–R2.4). The plaintext exists only in this answer.
   */
  createCode: async (employeeId: string): Promise<PairingCodeResponse> => {
    const response = await apiClient.post<ApiResponse<PairingCodeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_PAIRING_CODES(employeeId),
    );
    return response.data;
  },

  /** ADD_EDIT_EMPLOYEES: "Unpair phone"; the phone's next punch is refused (R2.12, R3.1). */
  unpair: async (employeeId: string): Promise<PairingStateResponse> => {
    const response = await apiClient.post<ApiResponse<PairingStateResponse>>(
      HR_ENDPOINTS.EMPLOYEE_PAIRING_UNPAIR(employeeId),
    );
    return response.data;
  },

  /** The linked employee's own pairing (R2.13); 404 "not linked" otherwise. */
  myState: async (): Promise<PairingStateResponse> => {
    const response = await apiClient.get<ApiResponse<PairingStateResponse>>(
      HR_ENDPOINTS.ME_PAIRING,
    );
    return response.data;
  },

  /** A code for the caller's own phone; the pairing is recorded as paired by "self" (R2.13). */
  createMyCode: async (): Promise<PairingCodeResponse> => {
    const response = await apiClient.post<ApiResponse<PairingCodeResponse>>(
      HR_ENDPOINTS.ME_PAIRING_CODES,
    );
    return response.data;
  },

  /** VIEW_ATTENDANCE: open signature-failure alerts for the HR dashboard panel (R10.5). */
  health: async (): Promise<AppHealthResponse> => {
    const response = await apiClient.get<ApiResponse<AppHealthResponse>>(
      HR_ENDPOINTS.ATTENDANCE_APP_HEALTH,
    );
    return response.data ?? { alerts: [] };
  },

  /** The latest consent text, the source of the privacy note (R9.14); carries no shop data. */
  consentLatest: async (): Promise<ConsentVersion> => {
    const response = await apiClient.get<ApiResponse<ConsentVersion>>(
      HR_ENDPOINTS.ATTENDANCE_APP_CONSENT_LATEST,
    );
    return response.data;
  },
};
