import { useState } from 'react';
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
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Cost & Price Trends Over Time</h3>
        <div className={styles.chartControls}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showCost}
              onChange={(e) => setShowCost(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Cost Price</span>
          </label>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showSelling}
              onChange={(e) => setShowSelling(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Selling Price</span>
          </label>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showMargin}
              onChange={(e) => setShowMargin(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Margin</span>
          </label>
        </div>
      </div>
      <div className={styles.chartContent}>
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
            {showCost && (
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
            )}
            {showSelling && (
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
            )}
            {showMargin && (
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
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

