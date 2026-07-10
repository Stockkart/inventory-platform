import { Card, CardBody, CardHeader, Grid, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './analytics.module.css';

interface DiscountImpact {
  totalDiscountGiven: number;
  totalRevenueWithDiscount: number;
  estimatedRevenueWithoutDiscount: number;
  revenueLostToDiscount: number;
  discountPercentOfRevenue: number;
  totalItemsWithDiscount: number;
  totalItemsSold: number;
  averageDiscountPerItem: number;
}

interface DiscountImpactCardProps {
  data: DiscountImpact;
}

function DiscountItem({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Stack gap="xs">
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="heading4" weight="semibold" color={danger ? 'danger' : 'primary'}>
        {value}
      </Text>
    </Stack>
  );
}

export function DiscountImpactCard({ data }: DiscountImpactCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <Text variant="heading4" weight="semibold">
          Discount Impact Analysis
        </Text>
      </CardHeader>
      <CardBody>
        <Grid className={styles.discountGrid}>
          <DiscountItem
            label="Total Discount Given"
            value={formatCurrency(data.totalDiscountGiven)}
          />
          <DiscountItem
            label="Revenue with Discount"
            value={formatCurrency(data.totalRevenueWithDiscount)}
          />
          <DiscountItem
            label="Estimated Revenue (No Discount)"
            value={formatCurrency(data.estimatedRevenueWithoutDiscount)}
          />
          <DiscountItem
            label="Revenue Lost to Discount"
            value={formatCurrency(data.revenueLostToDiscount)}
            danger
          />
          <DiscountItem
            label="Discount % of Revenue"
            value={`${data.discountPercentOfRevenue.toFixed(2)}%`}
          />
          <DiscountItem
            label="Items with Discount"
            value={`${data.totalItemsWithDiscount} / ${data.totalItemsSold}`}
          />
          <DiscountItem
            label="Average Discount per Item"
            value={formatCurrency(data.averageDiscountPerItem)}
          />
        </Grid>
      </CardBody>
    </Card>
  );
}
