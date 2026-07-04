import {
  PieChart,
  Pie,
  Cell,
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

interface SalesByGroupPieChartProps {
  data: GroupData[];
  groupBy: 'product' | 'lotId' | 'company';
  showRevenue: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

export function SalesByGroupPieChart({ data, groupBy, showRevenue }: SalesByGroupPieChartProps) {
  const chartData = data
    .map((item) => ({
      name: item.groupKey || 'No Lot ID',
      revenue: item.totalRevenue,
      quantity: item.totalQuantitySold,
    }))
    .sort((a, b) => (showRevenue ? b.revenue - a.revenue : b.quantity - a.quantity))
    .slice(0, 10);

  const pieData = chartData.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    value: showRevenue ? item.revenue : item.quantity,
    fullName: item.name,
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
          return 'Sales by Product';
        case 'lotId':
          return 'Sales by Lot ID';
        case 'company':
          return 'Sales by Company';
        default:
          return 'Sales by Group';
      }
    })();
    return `${baseTitle} - ${showRevenue ? 'Revenue' : 'Quantity'} Distribution`;
  };

  const formatTooltip = (value: number) => {
    if (showRevenue) {
      return formatCurrency(value);
    }
    return value;
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
                if (!percent || percent < 0.05) return ''; // Hide labels for very small slices
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
                const formattedValue = formatTooltip(value);
                const fullName = props?.payload?.fullName || name || '';
                return [formattedValue, fullName];
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

