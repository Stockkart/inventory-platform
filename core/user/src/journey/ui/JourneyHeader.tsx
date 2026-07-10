import { Link, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Inline,
  Link as UiLink,
  ThemeToggle,
  type BoxProps,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import styles from './JourneyHeader.module.css';

const logoImgProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  style: { height: 44, width: 'auto', maxWidth: 180, objectFit: 'contain' as const },
} as unknown as BoxProps;

export function JourneyHeader() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <Box as="header" className={styles.header} bg="elevated" padding="sm" width="full">
      <Inline maxWidth="xl" mx="auto" justify="between" width="full" padding="sm" gap="md">
        <Link to="/">
          <Box {...logoImgProps} />
        </Link>

        <Box as="nav" display="flex" gap="lg" align="center" justify="center">
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

        <Inline gap="sm" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="solid" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={styles.signInBtn}
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button variant="solid" size="sm" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </Inline>
      </Inline>
    </Box>
  );
}
