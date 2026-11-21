import { apiClient } from '@inventory-platform/api-client';

/** The admin app's own token key, never the shop app's `auth_token`. */
export const ADMIN_TOKEN_STORAGE_KEY = 'stockkart_admin_token';

/**
 * Point `apiClient` at the admin token. Run at module load by every admin module that reads or
 * writes the session (`useAdminSession`, the admin Query hooks), so it happens before the first
 * admin request. Safe to call more than once.
 */
export function selectAdminTokenStorage(): void {
  apiClient.setTokenStorageKey(ADMIN_TOKEN_STORAGE_KEY);
}
