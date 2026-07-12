import { useEffect } from 'react';
import { useAuthStore, useVerticalSchemaStore } from '@inventory-platform/session';
import { VerticalPluginProvider } from '@inventory-platform/routing';
import { DashboardLayout, DashboardRouteGuard } from '@inventory-platform/shell';
import {
  COMPOSED_DASHBOARD_MENU_GROUPS,
  useVerticalPluginStore,
} from '@inventory-platform/plugin-registry';
import { Outlet } from 'react-router';

export default function DashboardLayoutRoute() {
  return (
    <DashboardRouteGuard>
      <DashboardLayoutShell />
    </DashboardRouteGuard>
  );
}

function DashboardLayoutShell() {
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
      >
        <Outlet />
      </DashboardLayout>
    </VerticalPluginProvider>
  );
}
