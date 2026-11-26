import { useEffect } from 'react';
import { useAuthStore, useVerticalSchemaStore } from '@inventory-platform/session';
import { VerticalPluginProvider } from '@inventory-platform/routing';
import { DashboardLayout, DashboardRouteGuard } from '@inventory-platform/shell';
import type { DashboardLayoutProps } from '@inventory-platform/shell/types';
import {
  COMPOSED_DASHBOARD_MENU_GROUPS,
  registerComposedProfileTabs,
  useShopEntitlementsQuery,
  useVerticalPluginStore,
} from '@inventory-platform/plugin-registry';
import { Outlet } from 'react-router';

// Module-load registration so SSR and hydration of /dashboard/profile render
// the same tab set. Idempotent inside plugin-registry.
registerComposedProfileTabs();

export default function DashboardLayoutRoute() {
  // Server state from TanStack Query; the shell only filters nav and guards routes with it.
  const { data: planEntitlements } = useShopEntitlementsQuery();
  return (
    <DashboardRouteGuard
      menuGroups={COMPOSED_DASHBOARD_MENU_GROUPS}
      planEntitlements={planEntitlements}
    >
      <DashboardLayoutShell planEntitlements={planEntitlements ?? null} />
    </DashboardRouteGuard>
  );
}

function DashboardLayoutShell({
  planEntitlements,
}: {
  planEntitlements: DashboardLayoutProps['planEntitlements'];
}) {
  const { user } = useAuthStore();
  const shopSchema = useVerticalSchemaStore((s) => {
    if (!user?.shopId) return undefined;
    return s.shopSchemaByKey[`shop:${user.shopId}:regular`];
  });
  const verticalId = shopSchema?.verticalId;
  const fetchPlugin = useVerticalPluginStore((s) => s.fetchPlugin);
  const verticalPlugin = useVerticalPluginStore((s) =>
    verticalId ? s.pluginByVerticalId[verticalId] : undefined,
  );

  useEffect(() => {
    if (verticalId) {
      void fetchPlugin(verticalId);
    }
  }, [verticalId, fetchPlugin]);

  return (
    <VerticalPluginProvider plugin={verticalPlugin}>
      <DashboardLayout
        verticalPlugin={verticalPlugin ?? null}
        baseMenuGroups={COMPOSED_DASHBOARD_MENU_GROUPS}
        planEntitlements={planEntitlements}
      >
        <Outlet />
      </DashboardLayout>
    </VerticalPluginProvider>
  );
}
