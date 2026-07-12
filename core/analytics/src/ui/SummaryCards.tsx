import { Box, Text, chartChrome } from '@inventory-platform/ui-kit';

interface SummaryCardsProps {
  data: {
    summary: {
      totalRevenue: number;
      totalPurchases: number;
      averageOrderValue: number;
      totalTax: number;
      totalDiscount: number;
    };
  };
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Box className={chartChrome.metricCard}>
      <Text as="p" className={chartChrome.metricLabel}>
        {label}
      </Text>
      <Text as="p" className={chartChrome.metricValue}>
        {value}
      </Text>
      <Text as="p" className={chartChrome.metricHint}>
        {hint}
      </Text>
    </Box>
  );
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <Box className={chartChrome.metricGrid}>
      <MetricCard
        label="Total Revenue"
        value={formatCurrency(data.summary.totalRevenue)}
        hint="Gross sales in period"
      />
      <MetricCard
        label="Total Purchases"
        value={String(data.summary.totalPurchases)}
        hint="Number of orders"
      />
      <MetricCard
        label="Average Order Value"
        value={formatCurrency(data.summary.averageOrderValue)}
        hint="Per order"
      />
      <MetricCard
        label="Total Tax"
        value={formatCurrency(data.summary.totalTax)}
        hint="Tax collected"
      />
      <MetricCard
        label="Total Discount"
        value={formatCurrency(data.summary.totalDiscount)}
        hint="Discounts applied"
      />
    </Box>
  );
}
