import { Box, Button, Inline } from '@inventory-platform/ui-kit';
import styles from './analytics.module.css';

export type AnalyticsTabId = 'sales' | 'profit' | 'inventory' | 'vendors' | 'customers';

const TABS: ReadonlyArray<{ id: AnalyticsTabId; label: string }> = [
  { id: 'sales', label: 'Sales Analytics' },
  { id: 'profit', label: 'Profit Analysis' },
  { id: 'inventory', label: 'Inventory Analytics' },
  { id: 'vendors', label: 'Vendor Analytics' },
  { id: 'customers', label: 'Customer Analytics' },
];

interface AnalyticsTabsProps {
  activeTab: AnalyticsTabId;
  onTabChange: (tab: AnalyticsTabId) => void;
}

export function AnalyticsTabs({ activeTab, onTabChange }: AnalyticsTabsProps) {
  return (
    <Box as="nav" aria-label="Analytics sections" className={styles.tabBar}>
      <Inline gap="none">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant="ghost"
              className={active ? styles.tabLinkActive : styles.tabLink}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          );
        })}
      </Inline>
    </Box>
  );
}
