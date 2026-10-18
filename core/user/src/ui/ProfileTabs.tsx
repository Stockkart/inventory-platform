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
  useVisible?: () => boolean;
}

function toItem(ext: ProfileTabExtension): ProfileTabItem {
  return ext.useVisible
    ? { id: ext.id, label: ext.label, useVisible: ext.useVisible }
    : { id: ext.id, label: ext.label };
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
      if (ext.after === tab.id) ordered.push(toItem(ext));
    }
  }
  for (const ext of extensions) {
    if (!ext.after || !builtInIds.has(ext.after)) trailing.push(toItem(ext));
  }
  return [...ordered, ...trailing];
}

interface ProfileTabButtonProps {
  tab: ProfileTabItem;
  active: boolean;
  onTabChange: (id: ProfileTabKey) => void;
}

function ProfileTabButton({ tab, active, onTabChange }: ProfileTabButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      role="tab"
      aria-selected={active}
      className={cn(accountingChrome.navTab, active && accountingChrome.navTabActive)}
      onClick={() => onTabChange(tab.id)}
    >
      {tab.label}
    </Button>
  );
}

interface GatedProfileTabButtonProps extends ProfileTabButtonProps {
  useVisible: () => boolean;
}

/** An extension tab that asks its owner whether to show. */
function GatedProfileTabButton({ useVisible, ...props }: GatedProfileTabButtonProps) {
  const visible = useVisible();
  return visible ? <ProfileTabButton {...props} /> : null;
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
        {tabs.map((tab) =>
          tab.useVisible ? (
            <GatedProfileTabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onTabChange={onTabChange}
              useVisible={tab.useVisible}
            />
          ) : (
            <ProfileTabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onTabChange={onTabChange}
            />
          ),
        )}
      </Inline>
    </Box>
  );
}
