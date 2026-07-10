import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Box, Button, Card, CardBody, Inline, PageHeader, Stack } from '@inventory-platform/ui-kit';
import {
  PurchaseList,
  RefundHistoryList,
  VendorReturnHistoryList,
  HistoryFiltersBar,
  EMPTY_HISTORY_FILTERS,
  hasActiveHistoryFilters,
} from '../ui';
import type { HistoryFilters, HistoryTab } from '../ui';
import { isCustomerReturnEnabled, isVendorReturnEnabled } from '@inventory-platform/routing';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/session';
import { VendorInvoicesPage } from './VendorInvoicesPage';
import styles from './history.module.css';

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

function isTabEnabled(tab: HistoryTab, customerReturn: boolean, vendorReturn: boolean): boolean {
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

export function HistoryPage() {
  const location = useLocation();
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined,
  );

  const customerReturnEnabled = isCustomerReturnEnabled(shopCapabilities);
  const vendorReturnEnabled = isVendorReturnEnabled(shopCapabilities);
  const showReturnHints = customerReturnEnabled || vendorReturnEnabled;

  const [activeTab, setActiveTab] = useState<HistoryTab>(() => parseHistoryTab(location.state));
  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    setActiveTab(parseHistoryTab(location.state));
  }, [location.state, location.key]);

  useEffect(() => {
    if (!isTabEnabled(activeTab, customerReturnEnabled, vendorReturnEnabled)) {
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
    const joined = labels.length === 2 ? `${labels[0]} or ${labels[1]}` : labels[0] ?? '';
    return `Read-only timelines: invoices and past returns — use ${joined} under Products & Sales to record new returns`;
  }, [customerReturnEnabled, showReturnHints, vendorReturnEnabled]);

  const filtersActive = hasActiveHistoryFilters(appliedFilters, activeTab);

  const tabs: Array<{ id: HistoryTab; label: string }> = [
    { id: 'saleHistory', label: 'Sale history' },
    { id: 'purchaseHistory', label: 'Purchase history' },
  ];
  if (customerReturnEnabled) {
    tabs.push({
      id: 'customerReturnHistory',
      label: 'Customer return history',
    });
  }
  if (vendorReturnEnabled) {
    tabs.push({
      id: 'vendorReturnHistory',
      label: 'Supplier return history',
    });
  }

  return (
    <Stack gap="md">
      <PageHeader title="History" description={subtitle} />

      <Box as="nav" aria-label="History sections" className={styles.tabBar}>
        <Inline gap="none">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant="ghost"
                role="tab"
                aria-selected={active}
                className={active ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      </Box>

      <Card>
        <CardBody>
          <Stack gap="md">
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

            {activeTab === 'saleHistory' && <PurchaseList filters={appliedFilters} />}
            {activeTab === 'purchaseHistory' && (
              <VendorInvoicesPage embedded filters={appliedFilters} />
            )}
            {customerReturnEnabled && activeTab === 'customerReturnHistory' && (
              <RefundHistoryList filters={appliedFilters} />
            )}
            {vendorReturnEnabled && activeTab === 'vendorReturnHistory' && (
              <VendorReturnHistoryList filters={appliedFilters} />
            )}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
