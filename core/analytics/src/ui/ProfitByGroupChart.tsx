import { useState } from 'react';
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
import styles from './analytics.module.css';

interface ProfitGroupData {
  groupKey: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  numberOfSales: number;
}

interface ProfitByGroupChartProps {
  data: ProfitGroupData[];
  groupBy: 'product' | 'lotId' | 'businessType';
}

export function ProfitByGroupChart({ data, groupBy }: ProfitByGroupChartProps) {
  const [showRevenue, setShowRevenue] = useState(true);
  const [showCost, setShowCost] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  const chartData = data
    .map((item) => ({
      name: item.groupKey || 'No Lot ID',
      revenue: item.totalRevenue,
      cost: item.totalCost,
      profit: item.grossProfit,
      margin: item.marginPercent,
      quantity: item.totalQuantitySold,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTitle = () => {
    switch (groupBy) {
      case 'product':
        return 'Profit by Product';
      case 'lotId':
        return 'Profit by Lot ID';
      case 'businessType':
        return 'Profit by Business Type';
      default:
        return 'Profit by Group';
    }
  };

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{getTitle()}</h3>
        <div className={styles.chartControls}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showRevenue}
              onChange={(e) => setShowRevenue(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Revenue</span>
          </label>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showCost}
              onChange={(e) => setShowCost(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Cost</span>
          </label>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showProfit}
              onChange={(e) => setShowProfit(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Profit</span>
          </label>
        </div>
      </div>
      <div className={styles.chartContent}>
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
            {(showRevenue || showCost || showProfit) && <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />}
            {showProfit && <YAxis yAxisId="right" orientation="right" stroke="#10b981" />}
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return '';
                if (name === 'revenue' || name === 'cost' || name === 'profit') {
                  return formatCurrency(value);
                }
                if (name === 'margin') {
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
            {showRevenue && (
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
            )}
            {showCost && (
              <Bar yAxisId="left" dataKey="cost" fill="#ef4444" name="Cost" />
            )}
            {showProfit && (
              <Bar yAxisId="right" dataKey="profit" fill="#10b981" name="Profit" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

