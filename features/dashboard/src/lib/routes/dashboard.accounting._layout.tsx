import { NavLink, Outlet } from 'react-router';
import styles from './dashboard.accounting.module.css';

export default function AccountingLayoutRoute() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Accounting</h1>
        <p className={styles.subtitle}>
          Journals and trial balance, manual postings between accounts, and the chart for this shop.
        </p>
      </header>

      <nav className={styles.accountingTabs} aria-label="Accounting sections">
        <NavLink
          to="/dashboard/accounting"
          end
          className={({ isActive }) =>
            `${styles.accountingTab} ${isActive ? styles.accountingTabActive : ''}`
          }
        >
          Journals & trial balance
        </NavLink>
        <NavLink
          to="/dashboard/accounting/manual-journal"
          className={({ isActive }) =>
            `${styles.accountingTab} ${isActive ? styles.accountingTabActive : ''}`
          }
        >
          Manual journal
        </NavLink>
        <NavLink
          to="/dashboard/accounting/accounts"
          className={({ isActive }) =>
            `${styles.accountingTab} ${isActive ? styles.accountingTabActive : ''}`
          }
        >
          Chart of accounts
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
