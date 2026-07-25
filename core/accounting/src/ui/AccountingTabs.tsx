import { useLocation, useNavigate } from 'react-router';
import { NavTabBar, NavTabButton } from './tabNav';

const TABS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: '/dashboard/accounting', label: 'Overview', end: true },
  { to: '/dashboard/accounting/journal', label: 'Journal' },
  { to: '/dashboard/accounting/ledger', label: 'Ledger' },
  { to: '/dashboard/accounting/vendors', label: 'Vendors' },
  { to: '/dashboard/accounting/customers', label: 'Customers' },
  { to: '/dashboard/accounting/trial-balance', label: 'Trial Balance' },
  { to: '/dashboard/accounting/reports/profit-and-loss', label: 'P&L' },
  { to: '/dashboard/accounting/reports/balance-sheet', label: 'Balance Sheet' },
  { to: '/dashboard/accounting/opening-balances', label: 'Opening' },
  { to: '/dashboard/accounting/chart-of-accounts', label: 'Chart of Accounts' },
];

function isTabActive(pathname: string, to: string, end?: boolean) {
  if (end) {
    return pathname === to || pathname === `${to}/`;
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountingTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <NavTabBar ariaLabel="Accounting sections">
      {TABS.map((tab) => (
        <NavTabButton
          key={tab.to}
          active={isTabActive(pathname, tab.to, tab.end)}
          label={tab.label}
          onClick={() => navigate(tab.to)}
        />
      ))}
    </NavTabBar>
  );
}
