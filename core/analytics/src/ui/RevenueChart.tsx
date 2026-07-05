import { useState } from 'react';
import {
  Box,
  Checkbox,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './analytics.module.css';

interface TimeSeriesData {
  period: string;
  startTime: string;
  endTime: string;
  revenue: number;
  purchaseCount: number;
  averageOrderValue: number;
}

interface RevenueChartProps {
  data: TimeSeriesData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [showRevenue, setShowRevenue] = useState(true);
  const [showAOV, setShowAOV] = useState(true);
  const [showPurchases, setShowPurchases] = useState(true);

  const chartData = data.map((item) => ({
    period: item.period,
    revenue: item.revenue,
    purchases: item.purchaseCount,
    aov: item.averageOrderValue,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Stack gap="sm" className={styles.chartWrapper}>
      <Inline align="center" justify="between" className={styles.chartHeader}>
        <Text variant="heading4" weight="semibold">
          Revenue Over Time
        </Text>
        <Inline gap="md">
          <Checkbox
            label="Revenue"
            checked={showRevenue}
            onChange={(e) => setShowRevenue(e.target.checked)}
          />
          <Checkbox
            label="AOV"
            checked={showAOV}
            onChange={(e) => setShowAOV(e.target.checked)}
          />
          <Checkbox
            label="Purchases"
            checked={showPurchases}
            onChange={(e) => setShowPurchases(e.target.checked)}
          />
        </Inline>
      </Inline>
      <Box className={styles.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 11 }} />
            {(showRevenue || showAOV) && <YAxis yAxisId="left" stroke="#8884d8" />}
            {showPurchases && <YAxis yAxisId="right" orientation="right" stroke="#ffc658" />}
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return '';
                if (name === 'revenue' || name === 'aov') {
                  return formatCurrency(value);
                }
                return value;
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            {showRevenue ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                strokeWidth={2}
                name="Revenue"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : null}
            {showAOV ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="aov"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Avg Order Value"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : null}
            {showPurchases ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="purchases"
                stroke="#ffc658"
                strokeWidth={2}
                name="Purchases"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
