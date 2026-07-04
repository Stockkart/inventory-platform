import styles from './analytics.module.css';

interface ProfitSummaryCardsProps {
  data: {
    totalRevenue: number;
    totalCost: number;
    totalGrossProfit: number;
    overallMarginPercent: number;
    totalItemsSold: number;
    totalPurchases: number;
  };
}

export function ProfitSummaryCards({ data }: ProfitSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Revenue</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.totalRevenue)}</div>
        <div className={styles.summaryPeriod}>Total Revenue</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Cost</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.totalCost)}</div>
        <div className={styles.summaryPeriod}>Cost of Goods</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Gross Profit</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.totalGrossProfit)}</div>
        <div className={styles.summaryPeriod}>Profit After Costs</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Overall Margin</span>
        </div>
        <div className={styles.summaryValue}>{data.overallMarginPercent.toFixed(2)}%</div>
        <div className={styles.summaryPeriod}>Margin Percentage</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Items Sold</span>
        </div>
        <div className={styles.summaryValue}>{data.totalItemsSold}</div>
        <div className={styles.summaryPeriod}>Items Sold</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Purchases</span>
        </div>
        <div className={styles.summaryValue}>{data.totalPurchases}</div>
        <div className={styles.summaryPeriod}>Number of Orders</div>
      </div>
    </div>
  );
}

