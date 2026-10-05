import { Box, Button, Inline, accountingChrome, cn } from '@inventory-platform/ui-kit';
import { useProfileTabExtensions, type ProfileTabExtension } from './profileTabRegistry';

export const PROFILE_TABS = [
  { id: 'shop', label: 'Shop' },
  { id: 'numbering', label: 'Invoice numbering' },
  { id: 'invoice', label: 'Invoice layout' },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

/** Built-in tab id or the id of a registered `ProfileTabExtension`. */
export type ProfileTabKey = ProfileTabId | (string & {});

interface ProfileTabItem {
  id: ProfileTabKey;
  label: string;
}

/**
 * Built-in tabs followed by extensions, each inserted directly after its
 * `after` anchor (preserving registration order among siblings). Extensions
 * without an anchor, or with an unknown one, go at the end.
 */
export function orderProfileTabs(extensions: readonly ProfileTabExtension[]): ProfileTabItem[] {
  const ordered: ProfileTabItem[] = [];
  const trailing: ProfileTabItem[] = [];
  const builtInIds = new Set<string>(PROFILE_TABS.map((tab) => tab.id));

  for (const tab of PROFILE_TABS) {
    ordered.push({ id: tab.id, label: tab.label });
    for (const ext of extensions) {
      if (ext.after === tab.id) ordered.push({ id: ext.id, label: ext.label });
    }
  }
  for (const ext of extensions) {
    if (!ext.after || !builtInIds.has(ext.after)) trailing.push({ id: ext.id, label: ext.label });
  }
  return [...ordered, ...trailing];
}

export interface ProfileTabsProps {
  activeTab: ProfileTabKey;
  onTabChange: (id: ProfileTabKey) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const extensions = useProfileTabExtensions();
  const tabs = orderProfileTabs(extensions);

  return (
    <Box
      as="nav"
      aria-label="Profile sections"
      overflow="auto"
      className={accountingChrome.navTabBar}
    >
      <Inline gap="none">
        {tabs.map((tab) => (
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
