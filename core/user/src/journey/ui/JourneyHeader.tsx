import { Link } from 'react-router';
import {
  Box,
  Inline,
  Link as UiLink,
  ThemeToggle,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import styles from './JourneyHeader.module.css';

export function JourneyHeader() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Box as="header" className={styles.header}>
      <Inline className={styles.container} justify="between" width="full">
        <Link to="/" className={styles.logo}>
          <img
            src="/assets/logo/STOCKKART-3x.png"
            alt="StockKart"
            className={styles.logoImg}
          />
        </Link>

        <Box as="nav" className={styles.nav}>
          <UiLink href="/#features" className={styles.navLink}>
            Features
          </UiLink>
          <UiLink href="/#pricing" className={styles.navLink}>
            Pricing
          </UiLink>
          <UiLink href="/#about" className={styles.navLink}>
            About
          </UiLink>
        </Box>

        <Inline className={styles.actions} gap="sm">
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
        </Inline>
      </Inline>
    </Box>
  );
}
