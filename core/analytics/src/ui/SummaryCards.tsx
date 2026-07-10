import { Card, CardBody, Grid, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './analytics.module.css';

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

function MetricCard({ label, value, period }: { label: string; value: string; period: string }) {
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
          <Text variant="caption" color="muted">
            {period}
          </Text>
        </Stack>
      </CardBody>
    </Card>
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
    <Grid className={styles.summaryGrid}>
      <MetricCard
        label="Total Revenue"
        value={formatCurrency(data.summary.totalRevenue)}
        period="Total Revenue"
      />
      <MetricCard
        label="Total Purchases"
        value={String(data.summary.totalPurchases)}
        period="Number of Orders"
      />
      <MetricCard
        label="Average Order Value"
        value={formatCurrency(data.summary.averageOrderValue)}
        period="Per Order"
      />
      <MetricCard
        label="Total Tax"
        value={formatCurrency(data.summary.totalTax)}
        period="Tax Collected"
      />
      <MetricCard
        label="Total Discount"
        value={formatCurrency(data.summary.totalDiscount)}
        period="Discounts Applied"
      />
    </Grid>
  );
}
