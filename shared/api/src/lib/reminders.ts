import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  Reminder,
  CreateReminderDto,
  UpdateReminderDto,
  ReminderDetail,
  ReminderDetailListResponse,
  InventoryExpiryBuckets,
} from '@inventory-platform/types';

export interface RemindersListResponse {
  data: Reminder[];
}

export const remindersApi = {
  getAll: async (page = 0, size = 10): Promise<Reminder[]> => {
    const response = await apiClient.get<ApiResponse<RemindersListResponse>>(
      API_ENDPOINTS.REMINDERS.BASE,
      {
        page: String(page),
        size: String(size),
      }
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<Reminder> => {
    const response = await apiClient.get<ApiResponse<Reminder>>(
      API_ENDPOINTS.REMINDERS.BY_ID(id)
    );
    return response.data;
  },

  create: async (data: CreateReminderDto): Promise<Reminder> => {
    const response = await apiClient.post<ApiResponse<Reminder>>(
      API_ENDPOINTS.REMINDERS.BASE,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateReminderDto): Promise<Reminder> => {
    const response = await apiClient.put<ApiResponse<Reminder>>(
      API_ENDPOINTS.REMINDERS.BY_ID(id),
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<number> => {
    const response = await apiClient.delete<ApiResponse<number>>(
      API_ENDPOINTS.REMINDERS.BY_ID(id)
    );
    return response.data;
  },

  snooze: async (id: string, snoozeDays: number): Promise<Reminder> => {
    const response = await apiClient.post<ApiResponse<Reminder>>(
      API_ENDPOINTS.REMINDERS.SNOOZE(id),
      { snoozeDays }
    );
    return response.data;
  },

  getDetails: async (
    page = 0,
    size = 10
  ): Promise<ReminderDetailListResponse> => {
    const response = await apiClient.get<
      ApiResponse<ReminderDetailListResponse>
    >(API_ENDPOINTS.REMINDERS.DETAILS, {
      page: String(page),
      size: String(size),
    });

    return response.data;
  },

  getDetailById: async (id: string): Promise<ReminderDetail> => {
    const response = await apiClient.get<ApiResponse<ReminderDetail>>(
      API_ENDPOINTS.REMINDERS.DETAIL_BY_ID(id)
    );
    return response.data;
  },

  getExpiryBuckets: async (
    expiringSoonDays?: number
  ): Promise<InventoryExpiryBuckets> => {
    const params: Record<string, string> = {};
    if (expiringSoonDays !== undefined && expiringSoonDays > 0) {
      params.expiringSoonDays = String(expiringSoonDays);
    }
    const response = await apiClient.get<ApiResponse<InventoryExpiryBuckets>>(
      API_ENDPOINTS.REMINDERS.EXPIRY_BUCKETS,
      params
    );
    return response.data;
  },
};
