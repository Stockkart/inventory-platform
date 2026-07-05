import { Box, Button, Inline } from '@inventory-platform/ui-kit';
import styles from './taxes.module.css';

export const TAX_TABS = [
  { id: 'gstr1', label: 'GSTR-1' },
  { id: 'gstr2', label: 'GSTR-2' },
  { id: 'gstr3b', label: 'GSTR-3B' },
] as const;

export type TaxTabId = (typeof TAX_TABS)[number]['id'];

export interface TaxTabsProps {
  activeTab: TaxTabId;
  onTabChange: (id: TaxTabId) => void;
}

export function TaxTabs({ activeTab, onTabChange }: TaxTabsProps) {
  return (
    <Box as="nav" aria-label="Tax sections" className={styles.tabBar}>
      <Inline gap="none">
        {TAX_TABS.map((tab) => {
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
