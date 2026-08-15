import { Box, Button, Inline, accountingChrome, cn } from '@inventory-platform/ui-kit';

export const CUSTOMER_MIS_TABS = [
  { id: 'money', label: 'Customer money' },
  { id: 'sales', label: 'Sales' },
] as const;

export type CustomerMisTabId = (typeof CUSTOMER_MIS_TABS)[number]['id'];

export function parseCustomerMisTab(raw: string | null): CustomerMisTabId {
  return raw === 'sales' ? 'sales' : 'money';
}

export interface CustomerMisTabsProps {
  activeTab: CustomerMisTabId;
  onTabChange: (id: CustomerMisTabId) => void;
}

export function CustomerMisTabs({ activeTab, onTabChange }: CustomerMisTabsProps) {
  return (
    <Box
      as="nav"
      aria-label="Customer MIS sections"
      overflow="auto"
      className={accountingChrome.navTabBar}
    >
      <Inline gap="none">
        {CUSTOMER_MIS_TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant="ghost"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              accountingChrome.navTab,
              activeTab === tab.id && accountingChrome.navTabActive,
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </Inline>
    </Box>
  );
}
