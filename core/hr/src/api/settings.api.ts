import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  HolidayResponse,
  HrRolePermissionsResponse,
  HrSettingsResponse,
  HrSetupStatusResponse,
  LeaveTypeResponse,
  SaveHolidayRequest,
  SaveLeaveTypeRequest,
  UpdateHrRolePermissionsRequest,
  UpdateHrSettingsRequest,
} from '@inventory-platform/hr/types';
import { HR_ENDPOINTS } from './endpoints';

/** HR settings, holidays, leave types, role grid and setup status (`HrSettingsController` & co). */
export const hrSettingsApi = {
  getSettings: async (): Promise<HrSettingsResponse> => {
    const response = await apiClient.get<ApiResponse<HrSettingsResponse>>(HR_ENDPOINTS.SETTINGS);
    return response.data;
  },

  /** Partial update; send `revision` once settings have been saved. */
  updateSettings: async (body: UpdateHrSettingsRequest): Promise<HrSettingsResponse> => {
    const response = await apiClient.put<ApiResponse<HrSettingsResponse>>(
      HR_ENDPOINTS.SETTINGS,
      body,
    );
    return response.data;
  },

  getSetupStatus: async (): Promise<HrSetupStatusResponse> => {
    const response = await apiClient.get<ApiResponse<HrSetupStatusResponse>>(
      HR_ENDPOINTS.SETUP_STATUS,
    );
    return response.data;
  },

  /** Owner only. */
  getRolePermissions: async (): Promise<HrRolePermissionsResponse> => {
    const response = await apiClient.get<ApiResponse<HrRolePermissionsResponse>>(
      HR_ENDPOINTS.ROLE_PERMISSIONS,
    );
    return response.data;
  },

  /** Owner only; roles left out keep their row, missing dependencies are added on save. */
  updateRolePermissions: async (
    body: UpdateHrRolePermissionsRequest,
  ): Promise<HrRolePermissionsResponse> => {
    const response = await apiClient.put<ApiResponse<HrRolePermissionsResponse>>(
      HR_ENDPOINTS.ROLE_PERMISSIONS,
      body,
    );
    return response.data;
  },

  listHolidays: async (year?: number): Promise<HolidayResponse[]> => {
    const response = await apiClient.get<ApiResponse<HolidayResponse[]>>(
      HR_ENDPOINTS.HOLIDAYS,
      year != null ? { year: String(year) } : undefined,
    );
    return response.data ?? [];
  },

  createHoliday: async (body: SaveHolidayRequest): Promise<HolidayResponse> => {
    const response = await apiClient.post<ApiResponse<HolidayResponse>>(
      HR_ENDPOINTS.HOLIDAYS,
      body,
    );
    return response.data;
  },

  updateHoliday: async (id: string, body: SaveHolidayRequest): Promise<HolidayResponse> => {
    const response = await apiClient.put<ApiResponse<HolidayResponse>>(
      HR_ENDPOINTS.HOLIDAY_BY_ID(id),
      body,
    );
    return response.data;
  },

  deleteHoliday: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(HR_ENDPOINTS.HOLIDAY_BY_ID(id));
  },

  listLeaveTypes: async (): Promise<LeaveTypeResponse[]> => {
    const response = await apiClient.get<ApiResponse<LeaveTypeResponse[]>>(
      HR_ENDPOINTS.LEAVE_TYPES,
    );
    return response.data ?? [];
  },

  createLeaveType: async (body: SaveLeaveTypeRequest): Promise<LeaveTypeResponse> => {
    const response = await apiClient.post<ApiResponse<LeaveTypeResponse>>(
      HR_ENDPOINTS.LEAVE_TYPES,
      body,
    );
    return response.data;
  },

  /** Also used to deactivate (`active: false`); there is no delete. */
  updateLeaveType: async (id: string, body: SaveLeaveTypeRequest): Promise<LeaveTypeResponse> => {
    const response = await apiClient.put<ApiResponse<LeaveTypeResponse>>(
      HR_ENDPOINTS.LEAVE_TYPE_BY_ID(id),
      body,
    );
    return response.data;
  },
};
