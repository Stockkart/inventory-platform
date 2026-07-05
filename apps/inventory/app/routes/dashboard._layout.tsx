import { useAuthStore, useVerticalSchemaStore } from '@inventory-platform/session';
import { VerticalPluginProvider } from '@inventory-platform/routing';
import { DashboardLayout, DashboardRouteGuard } from '@inventory-platform/shell';
import { useVerticalPluginStore } from '@inventory-platform/plugin-registry';
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
  const verticalPlugin = useVerticalPluginStore((s) =>
    shopSchema?.verticalId
      ? s.pluginByVerticalId[shopSchema.verticalId]
      : undefined
  );

  return (
    <VerticalPluginProvider plugin={verticalPlugin}>
      <DashboardLayout verticalPlugin={verticalPlugin ?? null}>
        <Outlet />
      </DashboardLayout>
    </VerticalPluginProvider>
  );
}
