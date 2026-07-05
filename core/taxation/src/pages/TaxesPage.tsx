import { useState } from 'react';
import { PageHeader, Stack } from '@inventory-platform/ui-kit';
import { Gstr1Tab } from './Gstr1Tab';
import { Gstr2Tab } from './Gstr2Tab';
import { Gstr3bTab } from './Gstr3bTab';
import { TaxTabs, type TaxTabId } from '../ui/TaxTabs';
import styles from '../ui/taxes.module.css';

export function TaxesPage() {
  const [activeTab, setActiveTab] = useState<TaxTabId>('gstr1');

  return (
    <Stack gap="md" className={styles.page}>
      <PageHeader
        title="Taxes"
        description="View tax reports and GST filings for your business"
      />
      <TaxTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'gstr1' && <Gstr1Tab />}
      {activeTab === 'gstr2' && <Gstr2Tab />}
      {activeTab === 'gstr3b' && <Gstr3bTab />}
    </Stack>
  );
}
