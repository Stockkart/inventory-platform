import { useState } from 'react';
import { Box, Checkbox, Stack, Text, chartChrome } from '@inventory-platform/ui-kit';
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
    <Stack gap="sm" className={chartChrome.frame}>
      <Box className={chartChrome.chartToolbar}>
        <Text as="h3" className={chartChrome.chartTitle}>
          Revenue Over Time
        </Text>
        <Box className={chartChrome.chartLegendRow}>
          <Checkbox
            label="Revenue"
            checked={showRevenue}
            onChange={(e) => setShowRevenue(e.target.checked)}
          />
          <Checkbox label="AOV" checked={showAOV} onChange={(e) => setShowAOV(e.target.checked)} />
          <Checkbox
            label="Purchases"
            checked={showPurchases}
            onChange={(e) => setShowPurchases(e.target.checked)}
          />
        </Box>
      </Box>
      <Box className={chartChrome.plot}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 24, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="#94a3b8"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            {(showRevenue || showAOV) && (
              <YAxis
                yAxisId="left"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
            )}
            {showPurchases ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
            ) : null}
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return '';
                if (name === 'revenue' || name === 'aov') {
                  return formatCurrency(value);
                }
                return value;
              }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '12px' }} />
            {showRevenue ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                name="Revenue"
                dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ) : null}
            {showAOV ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="aov"
                stroke="#06b6d4"
                strokeWidth={2.5}
                name="Avg Order Value"
                dot={{ r: 3.5, fill: '#06b6d4', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ) : null}
            {showPurchases ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="purchases"
                stroke="#f59e0b"
                strokeWidth={2.5}
                name="Purchases"
                dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
