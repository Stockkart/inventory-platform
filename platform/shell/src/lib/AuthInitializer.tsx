import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { apiClient } from '@inventory-platform/api-client';

const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
]);

function isPublicAuthPath(pathname: string): boolean {
  return (
    PUBLIC_AUTH_PATHS.has(pathname) ||
    pathname.startsWith('/reset-password/') ||
    pathname.startsWith('/accept-invite/')
  );
}

/**
 * Syncs API client auth headers with the persisted store and signs the user out
 * when any protected request returns 401 (expired or invalid token).
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isAuthenticated, user, clearSession } = useAuthStore();

  useEffect(() => {
    if (token && isAuthenticated) {
      apiClient.setToken(token);
    } else if (!isAuthenticated) {
      apiClient.setToken(null);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user?.shopId) {
      apiClient.setShopId(user.shopId);
    } else if (!isAuthenticated) {
      apiClient.setShopId(null);
    }
  }, [isAuthenticated, user?.shopId]);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      const { isAuthenticated: authed } = useAuthStore.getState();
      if (!authed) {
        return;
      }
      clearSession();
      if (!isPublicAuthPath(window.location.pathname)) {
        navigate('/login', {
          replace: true,
          state: { sessionExpired: true, from: window.location.pathname },
        });
      }
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, [clearSession, navigate]);

  // If session was cleared while still on a protected route, send to login.
  useEffect(() => {
    if (!isAuthenticated && !token && !isPublicAuthPath(location.pathname)) {
      const onDashboard =
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/shop-selection') ||
        location.pathname.startsWith('/onboarding');
      if (onDashboard) {
        navigate('/login', { replace: true, state: { from: location.pathname } });
      }
    }
  }, [isAuthenticated, token, location.pathname, navigate]);

  return children;
}
