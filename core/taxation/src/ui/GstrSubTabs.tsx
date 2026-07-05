import { Box, Button, Inline } from '@inventory-platform/ui-kit';
import styles from './gstr.module.css';

export interface GstrSubTabDef<T extends string> {
  id: T;
  label: string;
}

export interface GstrSubTabsProps<T extends string> {
  tabs: readonly GstrSubTabDef<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  ariaLabel?: string;
}

export function GstrSubTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'GSTR report sections',
}: GstrSubTabsProps<T>) {
  return (
    <Box as="nav" aria-label={ariaLabel} className={styles.subTabBar}>
      <Inline gap="none">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant="ghost"
              className={active ? styles.subTabLinkActive : styles.subTabLink}
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
