import { useState } from 'react';
import { PageHeader, Stack } from '@inventory-platform/ui-kit';
import { SalesAnalytics } from '../ui/SalesAnalytics';
import { ProfitAnalytics } from '../ui/ProfitAnalytics';
import { VendorAnalytics } from '../ui/VendorAnalytics';
import { CustomerAnalytics } from '../ui/CustomerAnalytics';
import { InventoryAnalytics } from '../ui/InventoryAnalytics';
import { AnalyticsTabs, type AnalyticsTabId } from '../ui/AnalyticsTabs';

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('sales');

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Analytics Dashboard"
        description="Comprehensive insights on sales and profit performance"
      />
      <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'sales' && <SalesAnalytics />}
      {activeTab === 'profit' && <ProfitAnalytics />}
      {activeTab === 'inventory' && <InventoryAnalytics />}
      {activeTab === 'vendors' && <VendorAnalytics />}
      {activeTab === 'customers' && <CustomerAnalytics />}
    </Stack>
  );
}
