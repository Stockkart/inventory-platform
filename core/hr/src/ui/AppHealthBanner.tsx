import { Alert, Stack, Text } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import type { AppHealthAlert } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useAppHealthQuery } from '../queries/hooks';

/** `0.0123` → `1.2%`; one decimal so a rate just over the 1 % threshold reads as such. */
export function formatFailureRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** The one line of an alert (R10.5): shop, rate and failed count. */
export function appHealthAlertText(alert: AppHealthAlert, shopName: string): string {
  const failed = `${alert.failed} failed punch${alert.failed === 1 ? '' : 'es'}`;
  return `${shopName}: ${formatFailureRate(
    alert.rate,
  )} of Attendance app punches could not be verified in the last hour (${failed} of ${
    alert.attempts
  }).`;
}

/**
 * HR landing banner (R10.5): one alert per shop whose signature-failure rate crossed 1 % with at
 * least 20 app punches in the last 60 minutes. Read from `GET /attendance-app/health` every
 * 5 minutes; only users with VIEW_ATTENDANCE ask for it; nothing is rendered without open alerts.
 */
export function AppHealthBanner() {
  const { can } = useHrAccess();
  const canView = can('VIEW_ATTENDANCE');
  const shops = useAuthStore((s) => s.user?.shops);
  const health = useAppHealthQuery(canView);
  const alerts = health.data?.alerts ?? [];
  if (!canView || alerts.length === 0) return null;

  const shopName = (shopId: string) =>
    shops?.find((s) => s.shopId === shopId)?.shopName ?? `Shop ${shopId}`;

  return (
    <Stack gap="sm" aria-label="Attendance app alerts">
      {alerts.map((alert) => (
        <Alert key={alert.shopId} variant="danger">
          <Text weight="semibold">Attendance app: phones could not be verified</Text>
          <Text>{appHealthAlertText(alert, shopName(alert.shopId))}</Text>
          <Text variant="caption" color="muted">
            This points to a tampered app or a broken phone key, not a worker's mistake. Re-pair the
            affected phones from their employee pages.
          </Text>
        </Alert>
      ))}
    </Stack>
  );
}
