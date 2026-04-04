import { useState } from 'react';
import { Link } from 'react-router';
import { PurchaseList, RefundHistoryList } from '@inventory-platform/ui';
import styles from './dashboard.history.module.css';

export function meta() {
  return [
    { title: 'History - StockKart' },
    {
      name: 'description',
      content: 'View purchase and refund history',
    },
  ];
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'refunds'>(
    'purchases'
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>
          View purchase and refund history for your shop
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === 'purchases' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('purchases')}
        >
          Purchase History
        </button>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === 'refunds' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('refunds')}
        >
          Refund History
        </button>
        <Link to="/dashboard/vendor-invoices" className={styles.tab}>
          Vendor stock-in
        </Link>
      </div>

      <div className={styles.content}>
        {activeTab === 'purchases' && <PurchaseList />}
        {activeTab === 'refunds' && <RefundHistoryList />}
      </div>
    </div>
  );
}
