import styles from './analytics.module.css';

interface LowMarginProduct {
  inventoryId: string;
  productName: string;
  lotId: string | null;
  companyName: string;
  businessType: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  numberOfSales: number;
}

interface LowMarginProductsTableProps {
  data: LowMarginProduct[];
}

export function LowMarginProductsTable({ data }: LowMarginProductsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const getMarginColor = (margin: number) => {
    if (margin < 20) return '#ef4444'; // red
    if (margin < 30) return '#f59e0b'; // orange
    return '#6b7280'; // gray
  };

  return (
    <div className={styles.tableWrapper}>
      <h3 className={styles.tableTitle}>Low Margin Products</h3>
      <div className={styles.tableContainer}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Company</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Margin %</th>
              <th>Sales Count</th>
            </tr>
          </thead>
          <tbody>
            {data.map((product) => (
              <tr key={product.inventoryId}>
                <td>{product.productName}</td>
                <td>{product.companyName}</td>
                <td>{product.totalQuantitySold}</td>
                <td>{formatCurrency(product.totalRevenue)}</td>
                <td>{formatCurrency(product.totalCost)}</td>
                <td>{formatCurrency(product.grossProfit)}</td>
                <td style={{ color: getMarginColor(product.marginPercent), fontWeight: '600' }}>
                  {product.marginPercent.toFixed(2)}%
                </td>
                <td>{product.numberOfSales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

