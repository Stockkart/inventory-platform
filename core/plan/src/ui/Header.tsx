import { Link as RouterLink } from 'react-router';
import { Box, Inline, Link, Text, ThemeToggle, type BoxProps } from '@inventory-platform/ui-kit';
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
    <Box as="header" className={styles.header} padding="sm" width="full">
      <Inline maxWidth="xl" mx="auto" width="full" padding="sm" align="center" justify="between">
        <RouterLink to="/">
          <Box {...logoImgProps} />
        </RouterLink>

        <Box as="nav" display="flex" gap="lg" align="center" justify="center">
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

        <Inline gap="md" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <RouterLink to="/dashboard" className={styles.getStartedBtn}>
              <Text
                as="span"
                weight="semibold"
                style={{ padding: '0.5rem 1.6rem', display: 'inline-block' }}
              >
                Dashboard
              </Text>
            </RouterLink>
          ) : (
            <>
              <RouterLink to="/login" className={styles.signInBtn}>
                <Text as="span" weight="semibold">
                  Sign In
                </Text>
              </RouterLink>
              <RouterLink to="/signup" className={styles.getStartedBtn}>
                <Text
                  as="span"
                  weight="semibold"
                  style={{ padding: '0.5rem 1.6rem', display: 'inline-block' }}
                >
                  Get Started
                </Text>
              </RouterLink>
            </>
          )}
        </Inline>
      </Inline>
    </Box>
  );
}
