import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/session';
import { isCustomerReturnEnabled, isVendorReturnEnabled } from './capability-guards';

type ReturnFeature = 'customerReturn' | 'vendorReturn';

function isFeatureEnabled(
  feature: ReturnFeature,
  capabilities:
    | ReturnType<typeof useShopCapabilitiesStore.getState>['byShopId'][string]
    | undefined,
): boolean {
  return feature === 'customerReturn'
    ? isCustomerReturnEnabled(capabilities)
    : isVendorReturnEnabled(capabilities);
}

/** Redirects away when a shop capability feature is disabled (e.g. cafe returns). */
export function useCapabilityFeatureGuard(feature: ReturnFeature, redirectTo = '/dashboard') {
  const navigate = useNavigate();
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const loading = useShopCapabilitiesStore((s) => s.loading);
  const capabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined,
  );

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  const enabled = isFeatureEnabled(feature, capabilities);
  const resolved = capabilities != null || !activeShopId;
  const ready = !loading && resolved;

  useEffect(() => {
    if (ready && activeShopId && !enabled) {
      navigate(redirectTo, { replace: true });
    }
  }, [ready, activeShopId, enabled, navigate, redirectTo]);

  return { enabled, loading: !ready };
}
