import { Box, Button, Inline, accountingChrome, cn } from '@inventory-platform/ui-kit';

export const PROFILE_TABS = [
  { id: 'shop', label: 'Shop' },
  { id: 'numbering', label: 'Invoice numbering' },
  { id: 'invoice', label: 'Invoice layout' },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

export interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onTabChange: (id: ProfileTabId) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <Box
      as="nav"
      aria-label="Profile sections"
      overflow="auto"
      className={accountingChrome.navTabBar}
    >
      <Inline gap="none">
        {PROFILE_TABS.map((tab) => (
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
