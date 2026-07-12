import { useState } from 'react';
import { Box, Checkbox, Stack, Text, chartChrome } from '@inventory-platform/ui-kit';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TopProduct {
  inventoryId: string;
  productName: string;
  lotId: string | null;
  companyName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  numberOfSales: number;
}

interface TopProductsChartProps {
  data: TopProduct[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const [showRevenue, setShowRevenue] = useState(true);
  const [showQuantity, setShowQuantity] = useState(true);

  const chartData = (data ?? [])
    .slice(0, 10)
    .map((item) => ({
      name:
        item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
      revenue: item.totalRevenue,
      quantity: item.totalQuantitySold,
      sales: item.numberOfSales,
    }))
    .sort((a, b) => b.revenue - a.revenue);

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
          Top Products by Revenue
        </Text>
        <Box className={chartChrome.chartLegendRow}>
          <Checkbox
            label="Revenue"
            checked={showRevenue}
            onChange={(e) => setShowRevenue(e.target.checked)}
          />
          <Checkbox
            label="Quantity"
            checked={showQuantity}
            onChange={(e) => setShowQuantity(e.target.checked)}
          />
        </Box>
      </Box>
      <Box className={chartChrome.plot}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 24, left: 4, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              height={58}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#94a3b8"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            {showRevenue ? (
              <YAxis
                yAxisId="left"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
            ) : null}
            {showQuantity ? (
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
                if (name === 'revenue') {
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
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#3b82f6"
                name="Revenue"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            ) : null}
            {showQuantity ? (
              <Bar
                yAxisId="right"
                dataKey="quantity"
                fill="#06b6d4"
                name="Quantity Sold"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
