import { useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router';
import { useAuthStore, usePlanStatusStore, useVerticalSchemaStore, useShopCapabilitiesStore } from '@inventory-platform/store';
import { apiClient } from '@inventory-platform/api';
import { isPlanExpiryAllowedPath } from '@inventory-platform/types';
import { VerticalPluginProvider } from '@inventory-platform/routing';
import { DashboardLayout } from '@inventory-platform/ui';
import { canAccessDashboardPath } from '@inventory-platform/ui';
import { useShopAccessStore } from '@inventory-platform/store';
import { useVerticalPluginStore } from '@inventory-platform/plugin-registry';

export default function DashboardLayoutRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, token, fetchCurrentUser } = useAuthStore();
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
    shopSchema?.verticalId ? s.pluginByVerticalId[shopSchema.verticalId] : undefined
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
  }, [isAuthenticated, user?.shopId, fetchPlanStatus, fetchAccess, fetchShopSchema]);

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
    // Reset check flag when authentication state changes
    if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const checkAuth = async () => {
      // Prevent multiple simultaneous calls
      if (isCheckingRef.current) {
        return;
      }

      // If we're loading, wait - don't redirect yet
      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        // Only try to fetch if we have a token (might be valid)
        if (token && !hasCheckedAuth.current) {
          isCheckingRef.current = true;
          hasCheckedAuth.current = true;
          try {
            await fetchCurrentUser();
            // If successful, the auth state will update and we'll re-render
          } catch {
            // If fetch fails, redirect to login and reset flags
            hasCheckedAuth.current = false;
            // Preserve the current location for redirect after login
            navigate('/login', { state: { from: location.pathname }, replace: true });
          } finally {
            isCheckingRef.current = false;
          }
        } else if (!token) {
          // No token, redirect immediately but preserve location
          navigate('/login', { state: { from: location.pathname }, replace: true });
        }
      } else if (isAuthenticated && user && !user.shopId) {
        // User is authenticated but doesn't have a shop, redirect to shop selection
        navigate('/shop-selection', { replace: true });
      }
    };

    checkAuth();
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

  // Show loading while checking auth or if we have a token and haven't checked yet
  if (
    isLoading ||
    (token && !hasCheckedAuth.current && !isAuthenticated) ||
    (isAuthenticated && user?.shopId && planStatusLoading && !planStatus)
  ) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Only redirect if we're definitively not authenticated (no token and not checking)
  if (!isAuthenticated && !token) {
    return null; // Will redirect
  }

  // If user doesn't have shopId, redirect to shop selection
  if (isAuthenticated && user && !user.shopId) {
    return null; // Will redirect
  }

  return (
    <VerticalPluginProvider plugin={verticalPlugin}>
      <DashboardLayout verticalPlugin={verticalPlugin ?? null}>
        <Outlet />
      </DashboardLayout>
    </VerticalPluginProvider>
  );
}

