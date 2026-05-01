import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import {
  PurchaseList,
  RefundHistoryList,
  VendorReturnHistoryList,
} from '@inventory-platform/ui';
import VendorInvoicesPage from './dashboard.vendor-invoices';
import styles from './dashboard.history.module.css';

export type HistoryTab =
  | 'saleHistory'
  | 'purchaseHistory'
  | 'customerReturnHistory'
  | 'vendorReturnHistory';

/** Map legacy state from older redirects/bookmarks */
function coerceHistoryTab(v: string | undefined): HistoryTab | undefined {
  if (v === 'saleHistory' || v === 'purchaseHistory') return v;
  if (v === 'customerReturns' || v === 'customerReturnHistory') {
    return 'customerReturnHistory';
  }
  if (v === 'vendorReturns' || v === 'vendorReturnHistory') {
    return 'vendorReturnHistory';
  }
  return undefined;
}

function parseHistoryTab(state: unknown): HistoryTab {
  if (
    typeof state === 'object' &&
    state !== null &&
    'historyTab' in state &&
    typeof (state as { historyTab: unknown }).historyTab === 'string'
  ) {
    const raw = coerceHistoryTab((state as { historyTab: string }).historyTab);
    if (raw != null) return raw;
  }
  return 'saleHistory';
}

export function meta() {
  return [
    { title: 'History - StockKart' },
    {
      name: 'description',
      content:
        'Browse sale history, purchase invoices, customer return history, and supplier return history',
    },
  ];
}

export default function HistoryPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<HistoryTab>(() =>
    parseHistoryTab(location.state)
  );

  useEffect(() => {
    setActiveTab(parseHistoryTab(location.state));
  }, [location.state, location.key]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>
          Read-only timelines: invoices and past returns — use{' '}
          <strong>Return to customer</strong> or{' '}
          <strong>Return to vendor</strong> under Products &amp; Sales to record new
          returns
        </p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="History sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'saleHistory'}
          className={`${styles.tab} ${
            activeTab === 'saleHistory' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('saleHistory')}
        >
          Sale history
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'purchaseHistory'}
          className={`${styles.tab} ${
            activeTab === 'purchaseHistory' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('purchaseHistory')}
        >
          Purchase history
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customerReturnHistory'}
          className={`${styles.tab} ${
            activeTab === 'customerReturnHistory' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('customerReturnHistory')}
        >
          Customer return history
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'vendorReturnHistory'}
          className={`${styles.tab} ${
            activeTab === 'vendorReturnHistory' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('vendorReturnHistory')}
        >
          Supplier return history
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'saleHistory' && <PurchaseList />}
        {activeTab === 'purchaseHistory' && (
          <VendorInvoicesPage embedded />
        )}
        {activeTab === 'customerReturnHistory' && <RefundHistoryList />}
        {activeTab === 'vendorReturnHistory' && <VendorReturnHistoryList />}
      </div>
    </div>
  );
}
