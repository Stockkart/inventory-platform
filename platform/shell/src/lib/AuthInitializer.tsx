import { useEffect } from 'react';
import { useAuthStore } from '@inventory-platform/session';
import { apiClient } from '@inventory-platform/api-client';

/**
 * Component to initialize API client with token from auth store
 * This ensures the API client is synced with persisted auth state
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Sync API client token with store token
    if (token && isAuthenticated) {
      apiClient.setToken(token);
    } else if (!isAuthenticated) {
      apiClient.setToken(null);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    // Sync X-Shop-Id header for multi-shop support
    if (isAuthenticated && user?.shopId) {
      apiClient.setShopId(user.shopId);
    } else if (!isAuthenticated) {
      apiClient.setShopId(null);
    }
  }, [isAuthenticated, user?.shopId]);

  return children;
}

