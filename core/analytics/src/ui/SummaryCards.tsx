import styles from './analytics.module.css';

interface SummaryCardsProps {
  data: {
    summary: {
      totalRevenue: number;
      totalPurchases: number;
      averageOrderValue: number;
      totalTax: number;
      totalDiscount: number;
    };
  };
}

export function SummaryCards({ data }: SummaryCardsProps) {
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
        <div className={styles.summaryValue}>{formatCurrency(data.summary.totalRevenue)}</div>
        <div className={styles.summaryPeriod}>Total Revenue</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Purchases</span>
        </div>
        <div className={styles.summaryValue}>{data.summary.totalPurchases}</div>
        <div className={styles.summaryPeriod}>Number of Orders</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Average Order Value</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.summary.averageOrderValue)}</div>
        <div className={styles.summaryPeriod}>Per Order</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Tax</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.summary.totalTax)}</div>
        <div className={styles.summaryPeriod}>Tax Collected</div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryLabel}>Total Discount</span>
        </div>
        <div className={styles.summaryValue}>{formatCurrency(data.summary.totalDiscount)}</div>
        <div className={styles.summaryPeriod}>Discounts Applied</div>
      </div>
    </div>
  );
}

