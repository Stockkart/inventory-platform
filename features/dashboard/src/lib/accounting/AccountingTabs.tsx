import { NavLink } from 'react-router';
import styles from './accounting.module.css';

const TABS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: '/dashboard/accounting', label: 'Overview', end: true },
  { to: '/dashboard/accounting/journal', label: 'Journal' },
  { to: '/dashboard/accounting/ledger', label: 'Ledger' },
  { to: '/dashboard/accounting/vendors', label: 'Vendors' },
  { to: '/dashboard/accounting/customers', label: 'Customers' },
  { to: '/dashboard/accounting/trial-balance', label: 'Trial Balance' },
  { to: '/dashboard/accounting/chart-of-accounts', label: 'Chart of Accounts' },
];

export function AccountingTabs() {
  return (
    <nav className={styles.tabBar} aria-label="Accounting sections">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            isActive ? styles.tabLinkActive : styles.tabLink
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
