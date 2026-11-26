import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  useAuthStore,
  usePlanStatusStore,
  useVerticalSchemaStore,
  useShopAccessStore,
} from '@inventory-platform/session';
import { apiClient } from '@inventory-platform/api-client';
import { isWorkerRole } from '@inventory-platform/access';
import { isPlanExpiryAllowedPath } from '@inventory-platform/contracts';
import { CenteredLoader } from '@inventory-platform/ui-kit';
import { WORKER_HOME_PATH, canAccessDashboardPath } from '../lib/accessNav';
import { NotInShopPage } from '../lib/NotInShopPage';

export type DashboardRouteGuardState = {
  isReady: boolean;
  blockingContent: ReactNode | null;
};

function isWorkerHomePath(pathname: string): boolean {
  return pathname === WORKER_HOME_PATH || pathname.startsWith(`${WORKER_HOME_PATH}/`);
}

/**
 * Session, plan expiry, and shop-access bootstrap for dashboard routes.
 *
 * A WORKER login (worker-app R2.2) is sent straight to My HR. With no shop, or when
 * `/shops/me/access` fails or names no linked employee, it sees the "not part of a shop yet" page
 * and nothing else; the plan-expiry redirect does not apply to it (the backend decides what a
 * worker's own pages may answer while the shop's plan is expired).
 */
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
  const accessError = useShopAccessStore((s) => s.error);
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const hasCheckedAuth = useRef(false);
  const isCheckingRef = useRef(false);
  const isWorker = isAuthenticated && isWorkerRole(user?.role);

  useEffect(() => {
    apiClient.setPlanExpiredHandler(() => {
      // A worker has no plan page to go to (R2.1); their own pages stay where they are.
      if (isWorkerRole(useAuthStore.getState().user?.role)) {
        return;
      }
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

  // WORKER: every dashboard path other than My HR goes to My HR (R2.2), before access has loaded.
  useEffect(() => {
    if (!isWorker || isWorkerHomePath(location.pathname)) {
      return;
    }
    navigate(WORKER_HOME_PATH, { replace: true });
  }, [isWorker, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || accessLoading || !shopAccess) {
      return;
    }
    if (!canAccessDashboardPath(location.pathname, shopAccess, user.role)) {
      navigate(isWorker ? WORKER_HOME_PATH : '/dashboard', { replace: true });
    }
  }, [
    isAuthenticated,
    isWorker,
    user?.shopId,
    user?.role,
    accessLoading,
    shopAccess,
    location.pathname,
    navigate,
  ]);

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
      } else if (isAuthenticated && user && !user.shopId && !isWorkerRole(user.role)) {
        // A worker with no shop stays here and sees the "not part of a shop yet" page (R2.2);
        // shop selection (create a shop, ask for a staff role) is for staff logins only.
        navigate('/shop-selection', { replace: true });
      }
    };

    void checkAuth();
  }, [isAuthenticated, isLoading, user, token, navigate, fetchCurrentUser, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || planStatusLoading || isWorker) {
      return;
    }
    if (planStatus?.planExpired && !isPlanExpiryAllowedPath(location.pathname)) {
      navigate('/dashboard/plan-status', { replace: true });
    }
  }, [
    isAuthenticated,
    isWorker,
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

  if (isWorker && user) {
    // No shop: there is no access to fetch, so the page is the answer.
    if (!user.shopId) {
      return { isReady: false, blockingContent: <NotInShopPage /> };
    }
    if (!shopAccess) {
      if (accessLoading || !accessError) {
        return {
          isReady: false,
          blockingContent: <CenteredLoader fill minHeight="100dvh" label="Loading…" />,
        };
      }
      // `/shops/me/access` failed: nothing of the dashboard can be shown.
      return { isReady: false, blockingContent: <NotInShopPage /> };
    }
    if (!shopAccess.hr?.employeeId) {
      return { isReady: false, blockingContent: <NotInShopPage /> };
    }
    if (!isWorkerHomePath(location.pathname)) {
      // The redirect effect above is about to move to My HR; render nothing meanwhile.
      return { isReady: false, blockingContent: null };
    }
    return { isReady: true, blockingContent: null };
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
