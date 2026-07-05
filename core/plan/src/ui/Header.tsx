import { Link } from 'react-router';
import { ThemeToggle } from '@inventory-platform/shell';
import { useAuthStore } from '@inventory-platform/session';
import styles from './Header.module.css';

export function Header() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left: logo */}
        <Link to="/" className={styles.logo}>
          <img
            src="/assets/logo/STOCKKART-3x.png"
            alt="StockKart"
            className={styles.logoImg}
          />
        </Link>

        {/* Center: nav links */}
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#pricing" className={styles.navLink}>
            Pricing
          </a>
          <a href="#about" className={styles.navLink}>
            About
          </a>
        </nav>

        {/* Right: toggle + buttons */}
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
