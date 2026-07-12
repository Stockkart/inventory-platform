import { Box, Text, cn, chartChrome } from '@inventory-platform/ui-kit';

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
      isCurrency: true,
    },
    {
      label: 'Purchases',
      current: data.periodComparison.currentPeriod.totalPurchases,
      previous: data.periodComparison.previousPeriod.totalPurchases,
      change: data.periodComparison.purchaseCountChange,
      changePercent: data.periodComparison.purchaseCountChangePercent,
      isCurrency: false,
    },
    {
      label: 'Average Order Value',
      current: data.periodComparison.currentPeriod.averageOrderValue,
      previous: data.periodComparison.previousPeriod.averageOrderValue,
      change: data.periodComparison.aovChange,
      changePercent: data.periodComparison.aovChangePercent,
      isCurrency: true,
    },
  ];

  return (
    <Box className={chartChrome.comparisonCard}>
      <Box className={chartChrome.comparisonHeader}>
        <Text as="h3" className={chartChrome.comparisonTitle}>
          Period Comparison
        </Text>
      </Box>
      <Box className={chartChrome.comparisonBody}>
        {metrics.map((metric) => (
          <Box key={metric.label} className={chartChrome.comparisonTile}>
            <Text as="p" className={chartChrome.comparisonMetricLabel}>
              {metric.label}
            </Text>
            <Box className={chartChrome.comparisonRow}>
              <Text as="p" className={chartChrome.comparisonRowLabel}>
                Current
              </Text>
              <Text as="p" className={chartChrome.comparisonRowValue}>
                {metric.isCurrency ? formatCurrency(metric.current) : metric.current}
              </Text>
            </Box>
            <Box className={chartChrome.comparisonRow}>
              <Text as="p" className={chartChrome.comparisonRowLabel}>
                Previous
              </Text>
              <Text as="p" className={chartChrome.comparisonRowValue}>
                {metric.isCurrency ? formatCurrency(metric.previous) : metric.previous}
              </Text>
            </Box>
            <Text
              as="p"
              className={cn(
                chartChrome.comparisonDelta,
                metric.changePercent > 0 && chartChrome.comparisonDeltaUp,
                metric.changePercent < 0 && chartChrome.comparisonDeltaDown,
              )}
            >
              {metric.isCurrency
                ? formatCurrency(metric.change)
                : `${metric.change >= 0 ? '+' : ''}${metric.change}`}{' '}
              ({formatPercent(metric.changePercent)})
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
