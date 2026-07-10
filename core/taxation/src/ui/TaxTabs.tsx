import { NavTabBar, NavTabButton } from './tabNav';

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
    <NavTabBar ariaLabel="Tax sections">
      {TAX_TABS.map((tab) => (
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
