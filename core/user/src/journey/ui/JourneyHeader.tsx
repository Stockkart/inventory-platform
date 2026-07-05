import { Link } from 'react-router';
import { ThemeToggle } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import styles from './JourneyHeader.module.css';

export function JourneyHeader() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img
            src="/assets/logo/STOCKKART-3x.png"
            alt="StockKart"
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.nav}>
          <a href="/#features" className={styles.navLink}>
            Features
          </a>
          <a href="/#pricing" className={styles.navLink}>
            Pricing
          </a>
          <a href="/#about" className={styles.navLink}>
            About
          </a>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to="/dashboard" className={styles.getStartedBtn}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={styles.signInBtn}>
                Sign In
              </Link>
              <Link to="/signup" className={styles.getStartedBtn}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
