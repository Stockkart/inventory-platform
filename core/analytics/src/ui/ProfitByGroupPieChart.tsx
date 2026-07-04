import {
  PieChart,
  Pie,
  Cell,
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

interface ProfitByGroupPieChartProps {
  data: ProfitGroupData[];
  groupBy: 'product' | 'lotId' | 'businessType';
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

export function ProfitByGroupPieChart({ data, groupBy }: ProfitByGroupPieChartProps) {
  const chartData = data
    .map((item) => ({
      name: item.groupKey || 'No Lot ID',
      profit: item.grossProfit,
      margin: item.marginPercent,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const pieData = chartData.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    value: item.profit,
    fullName: item.name,
    margin: item.margin,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTitle = () => {
    const baseTitle = (() => {
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
    })();
    return `${baseTitle} - Profit Distribution`;
  };

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{getTitle()}</h3>
      </div>
      <div className={styles.pieChartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => {
                if (!percent || percent < 0.05) return '';
                return `${name}: ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined, props: any) => {
                if (value === undefined) return '';
                const formattedValue = formatCurrency(value);
                const margin = props?.payload?.margin || 0;
                return [`${formattedValue} (${margin.toFixed(2)}% margin)`, props?.payload?.fullName || name || ''];
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value, entry) => {
                const item = pieData.find((d) => d.name === value);
                return item ? item.fullName : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

