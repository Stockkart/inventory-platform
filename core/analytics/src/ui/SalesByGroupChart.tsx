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

interface GroupData {
  groupKey: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  numberOfSales: number;
}

interface SalesByGroupChartProps {
  data: GroupData[];
  groupBy: 'product' | 'lotId' | 'company';
}

export function SalesByGroupChart({ data, groupBy }: SalesByGroupChartProps) {
  const [showRevenue, setShowRevenue] = useState(true);
  const [showQuantity, setShowQuantity] = useState(true);

  const chartData = data
    .map((item) => ({
      name: item.groupKey || 'No Lot ID',
      revenue: item.totalRevenue,
      quantity: item.totalQuantitySold,
      sales: item.numberOfSales,
    }))
    .sort((a, b) => b.revenue - a.revenue)
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
        return 'Sales by Product';
      case 'lotId':
        return 'Sales by Lot ID';
      case 'company':
        return 'Sales by Company';
      default:
        return 'Sales by Group';
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
              checked={showQuantity}
              onChange={(e) => setShowQuantity(e.target.checked)}
              className={styles.toggleCheckbox}
            />
            <span>Quantity</span>
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
            {showRevenue && <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />}
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
            {showRevenue && (
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
            )}
            {showQuantity && (
              <Bar yAxisId="right" dataKey="quantity" fill="#82ca9d" name="Quantity" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
