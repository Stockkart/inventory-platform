import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  useAuthStore,
  usePlanStatusStore,
  useVerticalSchemaStore,
  useShopAccessStore,
} from '@inventory-platform/session';
import { apiClient } from '@inventory-platform/api-client';
import { isPlanExpiryAllowedPath } from '@inventory-platform/contracts';
import { CenteredLoader } from '@inventory-platform/ui-kit';
import { canAccessDashboardPath } from '../lib/accessNav';

export type DashboardRouteGuardState = {
  isReady: boolean;
  blockingContent: ReactNode | null;
};

/** Session, plan expiry, and shop-access bootstrap for dashboard routes. */
export function useDashboardRouteGuard(): DashboardRouteGuardState {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, token, fetchCurrentUser } = useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const planStatusLoading = usePlanStatusStore((s) => s.loading);
  const planStatus = usePlanStatusStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );
  const accessLoading = useShopAccessStore((s) => s.loading);
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const hasCheckedAuth = useRef(false);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    apiClient.setPlanExpiredHandler(() => {
      if (!isPlanExpiryAllowedPath(window.location.pathname)) {
        navigate('/dashboard/plan-status', { replace: true });
      }
    });
    return () => apiClient.setPlanExpiredHandler(null);
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId) {
      return;
    }
    void fetchPlanStatus({ force: true });
    void fetchAccess({ force: true });
    void fetchShopSchema();
  }, [isAuthenticated, user?.shopId, fetchPlanStatus, fetchAccess, fetchShopSchema]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || accessLoading || !shopAccess) {
      return;
    }
    if (!canAccessDashboardPath(location.pathname, shopAccess)) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user?.shopId, accessLoading, shopAccess, location.pathname, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const checkAuth = async () => {
      if (isCheckingRef.current) {
        return;
      }

      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        if (token && !hasCheckedAuth.current) {
          isCheckingRef.current = true;
          hasCheckedAuth.current = true;
          try {
            await fetchCurrentUser();
          } catch {
            hasCheckedAuth.current = false;
            navigate('/login', {
              state: { from: location.pathname },
              replace: true,
            });
          } finally {
            isCheckingRef.current = false;
          }
        } else if (!token) {
          navigate('/login', {
            state: { from: location.pathname },
            replace: true,
          });
        }
      } else if (isAuthenticated && user && !user.shopId) {
        navigate('/shop-selection', { replace: true });
      }
    };

    void checkAuth();
  }, [isAuthenticated, isLoading, user, token, navigate, fetchCurrentUser, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || planStatusLoading) {
      return;
    }
    if (planStatus?.planExpired && !isPlanExpiryAllowedPath(location.pathname)) {
      navigate('/dashboard/plan-status', { replace: true });
    }
  }, [
    isAuthenticated,
    user?.shopId,
    planStatus?.planExpired,
    planStatusLoading,
    location.pathname,
    navigate,
  ]);

  if (
    isLoading ||
    (token && !hasCheckedAuth.current && !isAuthenticated) ||
    (isAuthenticated && user?.shopId && planStatusLoading && !planStatus)
  ) {
    return {
      isReady: false,
      blockingContent: <CenteredLoader fill minHeight="100dvh" label="Loading…" />,
    };
  }

  if (!isAuthenticated && !token) {
    return { isReady: false, blockingContent: null };
  }

  if (isAuthenticated && user && !user.shopId) {
    return { isReady: false, blockingContent: null };
  }

  return { isReady: true, blockingContent: null };
}

export function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const { isReady, blockingContent } = useDashboardRouteGuard();
  if (blockingContent) {
    return blockingContent;
  }
  if (!isReady) {
    return null;
  }
  return children;
}
