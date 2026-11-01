import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AdminAccount,
  AdminActiveChangeRequest,
  AdminChangePasswordRequest,
  AdminCreateRequest,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminPasswordIssued,
  AdminReasonBody,
} from '@inventory-platform/admin/types';
import { ADMIN_ENDPOINTS } from './endpoints';

/** Admin sign-in and admin management. Shop-user tokens are rejected by these endpoints. */
export const adminApi = {
  login: async (body: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<ApiResponse<AdminLoginResponse>>(
      ADMIN_ENDPOINTS.LOGIN,
      body,
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post<ApiResponse<null>>(ADMIN_ENDPOINTS.LOGOUT);
  },

  me: async (): Promise<AdminAccount> => {
    const response = await apiClient.get<ApiResponse<AdminAccount>>(ADMIN_ENDPOINTS.ME);
    return response.data;
  },

  changePassword: async (body: AdminChangePasswordRequest): Promise<AdminAccount> => {
    const response = await apiClient.post<ApiResponse<AdminAccount>>(
      ADMIN_ENDPOINTS.CHANGE_PASSWORD,
      body,
    );
    return response.data;
  },

  listAdmins: async (): Promise<AdminAccount[]> => {
    const response = await apiClient.get<ApiResponse<AdminAccount[]>>(ADMIN_ENDPOINTS.ADMINS);
    return response.data;
  },

  createAdmin: async (body: AdminCreateRequest): Promise<AdminPasswordIssued> => {
    const response = await apiClient.post<ApiResponse<AdminPasswordIssued>>(
      ADMIN_ENDPOINTS.ADMINS,
      body,
    );
    return response.data;
  },

  setActive: async (id: string, body: AdminActiveChangeRequest): Promise<AdminAccount> => {
    const response = await apiClient.patch<ApiResponse<AdminAccount>>(
      ADMIN_ENDPOINTS.ADMIN_ACTIVE(id),
      body,
    );
    return response.data;
  },

  resetPassword: async (id: string, body: AdminReasonBody): Promise<AdminPasswordIssued> => {
    const response = await apiClient.post<ApiResponse<AdminPasswordIssued>>(
      ADMIN_ENDPOINTS.ADMIN_RESET_PASSWORD(id),
      body,
    );
    return response.data;
  },
};
