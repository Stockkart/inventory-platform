import { NavTabBar, NavTabButton } from './tabNav';

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
    <NavTabBar ariaLabel={ariaLabel}>
      {tabs.map((tab) => (
        <NavTabButton
          key={tab.id}
          active={activeTab === tab.id}
          label={tab.label}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </NavTabBar>
  );
}
