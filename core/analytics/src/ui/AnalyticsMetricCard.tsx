import { Card, CardBody, Stack, Text } from '@inventory-platform/ui-kit';

interface AnalyticsMetricCardProps {
  label: string;
  value: string;
  period?: string;
}

export function AnalyticsMetricCard({ label, value, period }: AnalyticsMetricCardProps) {
  return (
    <Card>
      <CardBody>
        <Stack gap="xs">
          <Text variant="caption" color="secondary">
            {label}
          </Text>
          <Text variant="heading2" weight="bold">
            {value}
          </Text>
          {period ? (
            <Text variant="caption" color="muted">
              {period}
            </Text>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
