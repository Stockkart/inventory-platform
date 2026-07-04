import styles from './analytics.module.css';

interface DiscountImpact {
  totalDiscountGiven: number;
  totalRevenueWithDiscount: number;
  estimatedRevenueWithoutDiscount: number;
  revenueLostToDiscount: number;
  discountPercentOfRevenue: number;
  totalItemsWithDiscount: number;
  totalItemsSold: number;
  averageDiscountPerItem: number;
}

interface DiscountImpactCardProps {
  data: DiscountImpact;
}

export function DiscountImpactCard({ data }: DiscountImpactCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <div className={styles.discountImpactCard}>
      <h3 className={styles.discountTitle}>Discount Impact Analysis</h3>
      <div className={styles.discountGrid}>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Total Discount Given</span>
          <span className={styles.discountValue}>{formatCurrency(data.totalDiscountGiven)}</span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Revenue with Discount</span>
          <span className={styles.discountValue}>{formatCurrency(data.totalRevenueWithDiscount)}</span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Estimated Revenue (No Discount)</span>
          <span className={styles.discountValue}>{formatCurrency(data.estimatedRevenueWithoutDiscount)}</span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Revenue Lost to Discount</span>
          <span className={styles.discountValue} style={{ color: '#ef4444' }}>
            {formatCurrency(data.revenueLostToDiscount)}
          </span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Discount % of Revenue</span>
          <span className={styles.discountValue}>{data.discountPercentOfRevenue.toFixed(2)}%</span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Items with Discount</span>
          <span className={styles.discountValue}>
            {data.totalItemsWithDiscount} / {data.totalItemsSold}
          </span>
        </div>
        <div className={styles.discountItem}>
          <span className={styles.discountLabel}>Average Discount per Item</span>
          <span className={styles.discountValue}>{formatCurrency(data.averageDiscountPerItem)}</span>
        </div>
      </div>
    </div>
  );
}

