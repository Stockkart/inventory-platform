import styles from './analytics.module.css';

interface ComparisonMetricsProps {
  data: {
    periodComparison: {
      currentPeriod: {
        totalRevenue: number;
        totalPurchases: number;
        averageOrderValue: number;
        totalTax: number;
        totalDiscount: number;
      };
      previousPeriod: {
        totalRevenue: number;
        totalPurchases: number;
        averageOrderValue: number;
        totalTax: number;
        totalDiscount: number;
      };
      revenueChange: number;
      revenueChangePercent: number;
      purchaseCountChange: number;
      purchaseCountChangePercent: number;
      aovChange: number;
      aovChangePercent: number;
    } | null;
  };
}

export function ComparisonMetrics({ data }: ComparisonMetricsProps) {
  if (!data.periodComparison) {
    return null;
  }
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return '#10b981'; // green
    if (value < 0) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const metrics = [
    {
      label: 'Revenue',
      current: data.periodComparison.currentPeriod.totalRevenue,
      previous: data.periodComparison.previousPeriod.totalRevenue,
      change: data.periodComparison.revenueChange,
      changePercent: data.periodComparison.revenueChangePercent,
    },
    {
      label: 'Purchases',
      current: data.periodComparison.currentPeriod.totalPurchases,
      previous: data.periodComparison.previousPeriod.totalPurchases,
      change: data.periodComparison.purchaseCountChange,
      changePercent: data.periodComparison.purchaseCountChangePercent,
    },
    {
      label: 'Average Order Value',
      current: data.periodComparison.currentPeriod.averageOrderValue,
      previous: data.periodComparison.previousPeriod.averageOrderValue,
      change: data.periodComparison.aovChange,
      changePercent: data.periodComparison.aovChangePercent,
    },
  ];

  return (
    <div className={styles.comparisonSection}>
      <h2 className={styles.comparisonTitle}>Period Comparison</h2>
      <div className={styles.comparisonGrid}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.comparisonCard}>
            <div className={styles.comparisonLabel}>{metric.label}</div>
            <div className={styles.comparisonValues}>
              <div className={styles.comparisonValue}>
                <span className={styles.comparisonValueLabel}>Current:</span>
                <span className={styles.comparisonValueNumber}>
                  {metric.label === 'Purchases'
                    ? metric.current
                    : formatCurrency(metric.current)}
                </span>
              </div>
              <div className={styles.comparisonValue}>
                <span className={styles.comparisonValueLabel}>Previous:</span>
                <span className={styles.comparisonValueNumber}>
                  {metric.label === 'Purchases'
                    ? metric.previous
                    : formatCurrency(metric.previous)}
                </span>
              </div>
            </div>
            <div
              className={styles.comparisonChange}
              style={{ color: getChangeColor(metric.changePercent) }}
            >
              <span>
                {metric.label === 'Purchases'
                  ? `${metric.change >= 0 ? '+' : ''}${metric.change}`
                  : formatCurrency(metric.change)}{' '}
                ({formatPercent(metric.changePercent)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

