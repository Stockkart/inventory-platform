import { useState } from 'react';
import { Box, Checkbox, Inline, Stack, Text } from '@inventory-platform/ui-kit';
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
interface CostPriceTrend {
  period: string;
  startTime: string;
  endTime: string;
  averageCostPrice: number;
  averagePriceToRetail: number;
  averageMargin: number;
  averageMarginPercent: number;
  totalItemsSold: number;
}

interface CostPriceTrendsChartProps {
  data: CostPriceTrend[];
}

export function CostPriceTrendsChart({ data }: CostPriceTrendsChartProps) {
  const [showCost, setShowCost] = useState(true);
  const [showSelling, setShowSelling] = useState(true);
  const [showMargin, setShowMargin] = useState(true);

  const chartData = data.map((item) => ({
    period: item.period,
    costPrice: item.averageCostPrice,
    priceToRetail: item.averagePriceToRetail,
    margin: item.averageMargin,
    marginPercent: item.averageMarginPercent,
    itemsSold: item.totalItemsSold,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Stack gap="sm" style={{ minHeight: 300 }}>
      <Inline
        align="center"
        justify="between"
        style={{
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid var(--border-color, #e5e7eb)',
        }}
      >
        <Text variant="heading4" weight="semibold">
          Cost &amp; Price Trends Over Time
        </Text>
        <Inline gap="md">
          <Checkbox
            label="Cost Price"
            checked={showCost}
            onChange={(e) => setShowCost(e.target.checked)}
          />
          <Checkbox
            label="Selling Price"
            checked={showSelling}
            onChange={(e) => setShowSelling(e.target.checked)}
          />
          <Checkbox
            label="Margin"
            checked={showMargin}
            onChange={(e) => setShowMargin(e.target.checked)}
          />
        </Inline>
      </Inline>
      <Box style={{ flex: 1, minHeight: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 11 }} />
            {(showCost || showSelling || showMargin) && <YAxis yAxisId="left" stroke="#8884d8" />}
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return '';
                if (name === 'costPrice' || name === 'priceToRetail' || name === 'margin') {
                  return formatCurrency(value);
                }
                if (name === 'marginPercent') {
                  return `${value.toFixed(2)}%`;
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
            {showCost ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="costPrice"
                stroke="#ef4444"
                strokeWidth={2}
                name="Avg Cost Price"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : null}
            {showSelling ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="priceToRetail"
                stroke="#8884d8"
                strokeWidth={2}
                name="Avg Selling Price"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : null}
            {showMargin ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="margin"
                stroke="#10b981"
                strokeWidth={2}
                name="Avg Margin"
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
