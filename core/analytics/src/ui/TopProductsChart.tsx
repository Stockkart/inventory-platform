import { useState } from 'react';
import { Box, Checkbox, Inline, Stack, Text, chartChrome } from '@inventory-platform/ui-kit';
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

  const chartData = data
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
      <Inline align="center" justify="between" className={chartChrome.chartToolbar}>
        <Text variant="heading4" weight="semibold">
          Top Products by Revenue
        </Text>
        <Inline gap="md">
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
        </Inline>
      </Inline>
      <Box flex="1" className={chartChrome.frameTall}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
            {showRevenue && <YAxis yAxisId="left" stroke="#8884d8" />}
            {showQuantity && <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />}
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return '';
                if (name === 'revenue') {
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
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
            ) : null}
            {showQuantity ? (
              <Bar yAxisId="right" dataKey="quantity" fill="#82ca9d" name="Quantity Sold" />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Stack>
  );
}
