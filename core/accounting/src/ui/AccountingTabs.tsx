import { useLocation, useNavigate } from 'react-router';
import { Box, Button, Inline } from '@inventory-platform/ui-kit';
import styles from './accounting.module.css';

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
    <Box as="nav" aria-label="Accounting sections" className={styles.tabBar}>
      <Inline gap="none">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.to, tab.end);
          return (
            <Button
              key={tab.to}
              type="button"
              size="sm"
              variant="ghost"
              className={active ? styles.tabLinkActive : styles.tabLink}
              onClick={() => navigate(tab.to)}
            >
              {tab.label}
            </Button>
          );
        })}
      </Inline>
    </Box>
  );
}
