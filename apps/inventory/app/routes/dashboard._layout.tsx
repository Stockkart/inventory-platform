import { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router';
import {
  useAuthStore,
  usePlanStatusStore,
  useVerticalSchemaStore,
  useShopCapabilitiesStore,
  useShopAccessStore,
} from '@inventory-platform/session';
import { apiClient } from '@inventory-platform/api-client';
import { isPlanExpiryAllowedPath } from '@inventory-platform/plan/types';
import { VerticalPluginProvider } from '@inventory-platform/routing';
import {
  DashboardLayout,
  canAccessDashboardPath,
} from '@inventory-platform/shell';
import { useVerticalPluginStore } from '@inventory-platform/plugin-registry';

export default function DashboardLayoutRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, token, fetchCurrentUser } =
    useAuthStore();
  const fetchPlanStatus = usePlanStatusStore((s) => s.fetchPlanStatus);
  const planStatusLoading = usePlanStatusStore((s) => s.loading);
  const planStatus = usePlanStatusStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined
  );
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined
  );
  const accessLoading = useShopAccessStore((s) => s.loading);
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const shopSchema = useVerticalSchemaStore((s) => {
    if (!user?.shopId) return undefined;
    return s.shopSchemaByKey[`shop:${user.shopId}:regular`];
  });
  const fetchVerticalPlugin = useVerticalPluginStore((s) => s.fetchPlugin);
  const verticalPlugin = useVerticalPluginStore((s) =>
    shopSchema?.verticalId
      ? s.pluginByVerticalId[shopSchema.verticalId]
      : undefined
  );
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
  }, [
    isAuthenticated,
    user?.shopId,
    fetchPlanStatus,
    fetchAccess,
    fetchShopSchema,
  ]);

  useEffect(() => {
    const verticalId = shopSchema?.verticalId;
    if (!verticalId) {
      return;
    }
    void fetchVerticalPlugin(verticalId);
  }, [shopSchema?.verticalId, fetchVerticalPlugin]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || accessLoading || !shopAccess) {
      return;
    }
    if (!canAccessDashboardPath(location.pathname, shopAccess)) {
      navigate('/dashboard', { replace: true });
    }
  }, [
    isAuthenticated,
    user?.shopId,
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
      } else if (isAuthenticated && user && !user.shopId) {
        navigate('/shop-selection', { replace: true });
      }
    };

    checkAuth();
  }, [
    isAuthenticated,
    isLoading,
    user,
    token,
    navigate,
    fetchCurrentUser,
    location.pathname,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !user?.shopId || planStatusLoading) {
      return;
    }
    if (
      planStatus?.planExpired &&
      !isPlanExpiryAllowedPath(location.pathname)
    ) {
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
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return null;
  }

  if (isAuthenticated && user && !user.shopId) {
    return null;
  }

  return (
    <VerticalPluginProvider plugin={verticalPlugin}>
      <DashboardLayout verticalPlugin={verticalPlugin ?? null}>
        <Outlet />
      </DashboardLayout>
    </VerticalPluginProvider>
  );
}
