import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  CreateReminderDto,
  Reminder,
  ReminderDetail,
  ReminderDetailListResponse,
  UpdateReminderDto,
} from '@inventory-platform/reminders/types';
import type { InventoryExpiryBuckets } from '@inventory-platform/product/types';
import { REMINDERS_ENDPOINTS } from './endpoints';

export interface RemindersListResponse {
  data: Reminder[];
}

export type ExpiryBucketsParams = {
  expiringSoonDays?: number;
};

function toQuery(params: Record<string, unknown>): Record<string, string> {
  const queryParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    queryParams[key] = String(value);
  });
  return queryParams;
}

export const remindersApi = {
  getAll: async (page = 0, size = 10): Promise<Reminder[]> => {
    const response = await apiClient.get<ApiResponse<RemindersListResponse>>(
      REMINDERS_ENDPOINTS.BASE,
      { page: String(page), size: String(size) },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<Reminder> => {
    const response = await apiClient.get<ApiResponse<Reminder>>(REMINDERS_ENDPOINTS.BY_ID(id));
    return response.data;
  },

  create: async (data: CreateReminderDto): Promise<Reminder> => {
    const response = await apiClient.post<ApiResponse<Reminder>>(REMINDERS_ENDPOINTS.BASE, data);
    return response.data;
  },

  update: async (id: string, data: UpdateReminderDto): Promise<Reminder> => {
    const response = await apiClient.put<ApiResponse<Reminder>>(
      REMINDERS_ENDPOINTS.BY_ID(id),
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<number> => {
    const response = await apiClient.delete<ApiResponse<number>>(REMINDERS_ENDPOINTS.BY_ID(id));
    return response.data;
  },

  snooze: async (id: string, snoozeDays: number): Promise<Reminder> => {
    const response = await apiClient.post<ApiResponse<Reminder>>(REMINDERS_ENDPOINTS.SNOOZE(id), {
      snoozeDays,
    });
    return response.data;
  },

  getDetails: async (page = 0, size = 10): Promise<ReminderDetailListResponse> => {
    const response = await apiClient.get<ApiResponse<ReminderDetailListResponse>>(
      REMINDERS_ENDPOINTS.DETAILS,
      { page: String(page), size: String(size) },
    );
    return response.data;
  },

  getDetailById: async (id: string): Promise<ReminderDetail> => {
    const response = await apiClient.get<ApiResponse<ReminderDetail>>(
      REMINDERS_ENDPOINTS.DETAIL_BY_ID(id),
    );
    return response.data;
  },

  getExpiryBuckets: async (params: ExpiryBucketsParams = {}): Promise<InventoryExpiryBuckets> => {
    const response = await apiClient.get<ApiResponse<InventoryExpiryBuckets>>(
      REMINDERS_ENDPOINTS.EXPIRY_BUCKETS,
      toQuery({
        expiringSoonDays:
          params.expiringSoonDays !== undefined && params.expiringSoonDays > 0
            ? params.expiringSoonDays
            : undefined,
      }),
    );
    return response.data;
  },
};
