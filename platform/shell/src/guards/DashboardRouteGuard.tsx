import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  isPlatformAdmin,
  isShopPlanExpired,
  useAuthStore,
  usePlanStatusStore,
  useVerticalSchemaStore,
  useShopAccessStore,
} from '@inventory-platform/session';
import { isPlanFeatureEnabled, type PlanEntitlementsView } from '@inventory-platform/access';
import type { DashboardMenuGroup } from '@inventory-platform/routing';
import { CenteredLoader } from '@inventory-platform/ui-kit';
import { canAccessDashboardPath, isPlatformAdminPath } from '../lib/accessNav';
import { planFeatureForPath } from '../lib/planEntitlementNav';
import { mustLeaveForPlanStatus, PLAN_STATUS_PATH } from '../lib/planExpiryRedirect';

export type DashboardRouteGuardState = {
  isReady: boolean;
  blockingContent: ReactNode | null;
};

/**
 * Session, plan expiry, and shop-access bootstrap for dashboard routes. `menuGroups` is the
 * dashboard nav; its items' `requiresFeature` decides which paths need a plan feature.
 * `planEntitlements` comes from the app layer; while it is unknown every path is allowed.
 */
export function useDashboardRouteGuard(
  menuGroups: DashboardMenuGroup[],
  planEntitlements: PlanEntitlementsView | null | undefined,
): DashboardRouteGuardState {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, token, fetchCurrentUser } = useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const planStatusLoading = usePlanStatusStore((s) => s.loading);
  const planStatus = usePlanStatusStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );
  // From the plan status or from any call the API refused as plan-expired (AuthInitializer).
  const planExpired = usePlanStatusStore((s) => isShopPlanExpired(s, user?.shopId));
  const leaveForPlanStatus =
    isAuthenticated &&
    Boolean(user?.shopId) &&
    mustLeaveForPlanStatus(location.pathname, planExpired);
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );
  const accessLoading = useShopAccessStore((s) => s.loading);
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const hasCheckedAuth = useRef(false);
  const isCheckingRef = useRef(false);

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
    if (
      isAuthenticated &&
      user &&
      isPlatformAdminPath(location.pathname) &&
      !isPlatformAdmin(user)
    ) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

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

  // Runs again after every navigation (`location.key`), so a redirect that another navigation
  // cancelled (a click while My Plan's code is still downloading) is sent again, not lost.
  useEffect(() => {
    if (leaveForPlanStatus) {
      navigate(PLAN_STATUS_PATH, { replace: true });
    }
  }, [leaveForPlanStatus, location.key, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || planStatusLoading || planExpired) {
      return;
    }
    const feature = planFeatureForPath(menuGroups, location.pathname);
    if (feature && !isPlanFeatureEnabled(planEntitlements, feature)) {
      navigate(`${PLAN_STATUS_PATH}?locked=${feature}`, { replace: true });
    }
  }, [
    menuGroups,
    planEntitlements,
    isAuthenticated,
    user?.shopId,
    planExpired,
    planStatusLoading,
    location.pathname,
    navigate,
  ]);

  // An expired shop's screens are not rendered on the way to My Plan: each would ask the API,
  // be refused, and show its own error.
  if (
    isLoading ||
    (token && !hasCheckedAuth.current && !isAuthenticated) ||
    (isAuthenticated && user?.shopId && planStatusLoading && !planStatus) ||
    leaveForPlanStatus
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

interface DashboardRouteGuardProps {
  /** Dashboard nav, for the plan feature each path needs. */
  menuGroups: DashboardMenuGroup[];
  /** The shop's plan entitlements, loaded by the app layer. Unknown allows every path. */
  planEntitlements?: PlanEntitlementsView | null;
  children: ReactNode;
}

export function DashboardRouteGuard({
  menuGroups,
  planEntitlements,
  children,
}: DashboardRouteGuardProps) {
  const { isReady, blockingContent } = useDashboardRouteGuard(menuGroups, planEntitlements);
  if (blockingContent) {
    return blockingContent;
  }
  if (!isReady) {
    return null;
  }
  return children;
}
