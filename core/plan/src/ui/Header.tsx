import { Link as RouterLink } from 'react-router';
import { Box, Link, ThemeToggle, type BoxProps } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import styles from './Header.module.css';

const logoImgProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  className: styles.logoImg,
} as unknown as BoxProps;

export function Header() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Box as="header" className={styles.header}>
      <Box className={styles.container}>
        <RouterLink to="/" className={styles.logo}>
          <Box {...logoImgProps} />
        </RouterLink>

        <Box as="nav" className={styles.nav}>
          <Link href="#features" className={styles.navLink}>
            Features
          </Link>
          <Link href="#pricing" className={styles.navLink}>
            Pricing
          </Link>
          <Link href="#about" className={styles.navLink}>
            About
          </Link>
        </Box>

        <Box className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated ? (
            <RouterLink to="/dashboard" className={styles.getStartedBtn}>
              Dashboard
            </RouterLink>
          ) : (
            <>
              <RouterLink to="/login" className={styles.signInBtn}>
                Sign In
              </RouterLink>
              <RouterLink to="/signup" className={styles.getStartedBtn}>
                Get Started
              </RouterLink>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
