import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { LinkableUser } from '@inventory-platform/user/types';
import { USER_ENDPOINTS } from './endpoints';

export const userLookupApi = {
  /** Search for a user by email to link to vendor/customer. */
  searchByEmail: async (email: string): Promise<LinkableUser | null> => {
    const response = await apiClient.get<ApiResponse<LinkableUser | null>>(USER_ENDPOINTS.SEARCH, {
      email,
    });
    return response?.data ?? null;
  },
};
