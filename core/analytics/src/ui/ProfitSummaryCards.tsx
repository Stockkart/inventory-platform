import {
  Card,
  CardBody,
  Grid,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './analytics.module.css';

interface ProfitSummaryCardsProps {
  data: {
    totalRevenue: number;
    totalCost: number;
    totalGrossProfit: number;
    overallMarginPercent: number;
    totalItemsSold: number;
    totalPurchases: number;
  };
}

function MetricCard({
  label,
  value,
  period,
}: {
  label: string;
  value: string;
  period: string;
}) {
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

export function ProfitSummaryCards({ data }: ProfitSummaryCardsProps) {
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
        value={formatCurrency(data.totalRevenue)}
        period="Total Revenue"
      />
      <MetricCard
        label="Total Cost"
        value={formatCurrency(data.totalCost)}
        period="Cost of Goods"
      />
      <MetricCard
        label="Gross Profit"
        value={formatCurrency(data.totalGrossProfit)}
        period="Profit After Costs"
      />
      <MetricCard
        label="Overall Margin"
        value={`${data.overallMarginPercent.toFixed(2)}%`}
        period="Margin Percentage"
      />
      <MetricCard
        label="Total Items Sold"
        value={String(data.totalItemsSold)}
        period="Items Sold"
      />
      <MetricCard
        label="Total Purchases"
        value={String(data.totalPurchases)}
        period="Number of Orders"
      />
    </Grid>
  );
}
