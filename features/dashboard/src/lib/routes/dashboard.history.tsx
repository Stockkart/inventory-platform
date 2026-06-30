import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  PurchaseList,
  RefundHistoryList,
  VendorReturnHistoryList,
  HistoryFiltersBar,
  EMPTY_HISTORY_FILTERS,
  hasActiveHistoryFilters,
  isCustomerReturnEnabled,
  isVendorReturnEnabled,
} from '@inventory-platform/ui';
import type { HistoryFilters, HistoryTab } from '@inventory-platform/ui';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/store';
import VendorInvoicesPage from './dashboard.vendor-invoices';
import styles from './dashboard.history.module.css';

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

function isTabEnabled(
  tab: HistoryTab,
  customerReturn: boolean,
  vendorReturn: boolean
): boolean {
  if (tab === 'customerReturnHistory') return customerReturn;
  if (tab === 'vendorReturnHistory') return vendorReturn;
  return true;
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
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
  );

  const customerReturnEnabled = isCustomerReturnEnabled(shopCapabilities);
  const vendorReturnEnabled = isVendorReturnEnabled(shopCapabilities);
  const showReturnHints = customerReturnEnabled || vendorReturnEnabled;

  const [activeTab, setActiveTab] = useState<HistoryTab>(() =>
    parseHistoryTab(location.state)
  );
  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(
    EMPTY_HISTORY_FILTERS
  );
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(
    EMPTY_HISTORY_FILTERS
  );

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    setActiveTab(parseHistoryTab(location.state));
  }, [location.state, location.key]);

  useEffect(() => {
    if (
      !isTabEnabled(activeTab, customerReturnEnabled, vendorReturnEnabled)
    ) {
      setActiveTab('saleHistory');
    }
  }, [activeTab, customerReturnEnabled, vendorReturnEnabled]);

  const subtitle = useMemo(() => {
    if (!showReturnHints) {
      return 'Read-only timelines: sale invoices and supplier purchase bills.';
    }
    const labels: string[] = [];
    if (customerReturnEnabled) labels.push('Return to customer');
    if (vendorReturnEnabled) labels.push('Return to vendor');
    const joined =
      labels.length === 2 ? `${labels[0]} or ${labels[1]}` : labels[0] ?? '';
    return `Read-only timelines: invoices and past returns — use ${joined} under Products & Sales to record new returns`;
  }, [customerReturnEnabled, showReturnHints, vendorReturnEnabled]);

  const filtersActive = hasActiveHistoryFilters(appliedFilters, activeTab);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>{subtitle}</p>
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
        {customerReturnEnabled && (
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
        )}
        {vendorReturnEnabled && (
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
        )}
      </div>

      <div className={styles.content}>
        <HistoryFiltersBar
          filters={draftFilters}
          onChange={setDraftFilters}
          onApply={() => setAppliedFilters({ ...draftFilters })}
          onClear={() => {
            setDraftFilters(EMPTY_HISTORY_FILTERS);
            setAppliedFilters(EMPTY_HISTORY_FILTERS);
          }}
          activeTab={activeTab}
          hasAppliedFilters={filtersActive}
        />

        {activeTab === 'saleHistory' && (
          <PurchaseList filters={appliedFilters} />
        )}
        {activeTab === 'purchaseHistory' && (
          <VendorInvoicesPage embedded filters={appliedFilters} />
        )}
        {customerReturnEnabled && activeTab === 'customerReturnHistory' && (
          <RefundHistoryList filters={appliedFilters} />
        )}
        {vendorReturnEnabled && activeTab === 'vendorReturnHistory' && (
          <VendorReturnHistoryList filters={appliedFilters} />
        )}
      </div>
    </div>
  );
}
