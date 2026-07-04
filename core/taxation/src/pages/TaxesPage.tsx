import { useState } from 'react';
import { Gstr1Tab } from './Gstr1Tab';
import { Gstr2Tab } from './Gstr2Tab';
import { Gstr3bTab } from './Gstr3bTab';
import styles from '../ui/taxes.module.css';

const TAX_TABS = [
  { id: 'gstr1', label: 'GSTR-1' },
  { id: 'gstr2', label: 'GSTR-2' },
  { id: 'gstr3b', label: 'GSTR-3B' },
] as const;

export function TaxesPage() {
  const [activeTab, setActiveTab] = useState<(typeof TAX_TABS)[number]['id']>('gstr1');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Taxes</h1>
        <p className={styles.subtitle}>View tax reports and GST filings for your business</p>
      </header>

      <div className={styles.tabs}>
        {TAX_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'gstr1' && <Gstr1Tab />}
        {activeTab === 'gstr2' && <Gstr2Tab />}
        {activeTab === 'gstr3b' && <Gstr3bTab />}
      </div>
    </div>
  );
}
