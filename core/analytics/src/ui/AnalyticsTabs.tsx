import { NavTabBar, NavTabButton } from './tabNav';

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
    <NavTabBar ariaLabel="Analytics sections">
      {TABS.map((tab) => (
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
