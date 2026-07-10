import { Card, CardBody, CardHeader, Grid, Inline, Stack, Text } from '@inventory-platform/ui-kit';

interface ComparisonMetricsProps {
  data: {
    periodComparison: {
      currentPeriod: {
        totalRevenue: number;
        totalPurchases: number;
        averageOrderValue: number;
        totalTax: number;
        totalDiscount: number;
      };
      previousPeriod: {
        totalRevenue: number;
        totalPurchases: number;
        averageOrderValue: number;
        totalTax: number;
        totalDiscount: number;
      };
      revenueChange: number;
      revenueChangePercent: number;
      purchaseCountChange: number;
      purchaseCountChangePercent: number;
      aovChange: number;
      aovChangePercent: number;
    } | null;
  };
}

export function ComparisonMetrics({ data }: ComparisonMetricsProps) {
  if (!data.periodComparison) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const metrics = [
    {
      label: 'Revenue',
      current: data.periodComparison.currentPeriod.totalRevenue,
      previous: data.periodComparison.previousPeriod.totalRevenue,
      change: data.periodComparison.revenueChange,
      changePercent: data.periodComparison.revenueChangePercent,
    },
    {
      label: 'Purchases',
      current: data.periodComparison.currentPeriod.totalPurchases,
      previous: data.periodComparison.previousPeriod.totalPurchases,
      change: data.periodComparison.purchaseCountChange,
      changePercent: data.periodComparison.purchaseCountChangePercent,
    },
    {
      label: 'Average Order Value',
      current: data.periodComparison.currentPeriod.averageOrderValue,
      previous: data.periodComparison.previousPeriod.averageOrderValue,
      change: data.periodComparison.aovChange,
      changePercent: data.periodComparison.aovChangePercent,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <Text variant="heading4" weight="semibold">
          Period Comparison
        </Text>
      </CardHeader>
      <CardBody>
        <Grid columns={3} gap="md">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardBody>
                <Stack gap="sm">
                  <Text variant="heading4" weight="semibold">
                    {metric.label}
                  </Text>
                  <Stack gap="xs">
                    <Inline align="center" justify="between">
                      <Text variant="caption" color="secondary">
                        Current:
                      </Text>
                      <Text weight="semibold">
                        {metric.label === 'Purchases'
                          ? metric.current
                          : formatCurrency(metric.current)}
                      </Text>
                    </Inline>
                    <Inline align="center" justify="between">
                      <Text variant="caption" color="secondary">
                        Previous:
                      </Text>
                      <Text weight="semibold">
                        {metric.label === 'Purchases'
                          ? metric.previous
                          : formatCurrency(metric.previous)}
                      </Text>
                    </Inline>
                  </Stack>
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{
                      color:
                        metric.changePercent > 0
                          ? '#10b981'
                          : metric.changePercent < 0
                          ? '#ef4444'
                          : undefined,
                    }}
                  >
                    {metric.label === 'Purchases'
                      ? `${metric.change >= 0 ? '+' : ''}${metric.change}`
                      : formatCurrency(metric.change)}{' '}
                    ({formatPercent(metric.changePercent)})
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Grid>
      </CardBody>
    </Card>
  );
}
