import { ChipTabBar, ChipTabButton } from './tabNav';

export interface GstrSubTabDef<T extends string> {
  id: T;
  label: string;
  /** Longer label for tooltip when `label` is abbreviated */
  title?: string;
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
    <ChipTabBar ariaLabel={ariaLabel}>
      {tabs.map((tab) => (
        <ChipTabButton
          key={tab.id}
          active={activeTab === tab.id}
          label={tab.label}
          title={tab.title ?? tab.label}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </ChipTabBar>
  );
}
