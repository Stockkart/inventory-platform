import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Inline,
  Link,
  ThemeToggle,
  useMatchMedia,
  type BoxProps,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';

const logoStyle = {
  height: 36,
  width: 'auto',
  maxWidth: 160,
  objectFit: 'contain' as const,
  flexShrink: 0,
};

const logoImgProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  style: logoStyle,
} as unknown as BoxProps;

export function Header() {
  const { isAuthenticated } = useAuthStore();
  const isMobile = useMatchMedia('(max-width: 768px)');
  const navigate = useNavigate();

  return (
    <Box as="header" width="full" className={surfaceChrome.planHeader}>
      <Inline
        maxWidth="xl"
        mx="auto"
        width="full"
        align="center"
        justify="between"
        className={surfaceChrome.planHeaderInner}
      >
        <RouterLink to="/">
          <Box {...logoImgProps} />
        </RouterLink>

        {!isMobile ? (
          <Box as="nav" display="flex" gap="lg" align="center" justify="center">
            <Link href="#features" tone="nav">
              Features
            </Link>
            <Link href="#pricing" tone="nav">
              Pricing
            </Link>
            <Link href="#about" tone="nav">
              About
            </Link>
          </Box>
        ) : null}

        <Inline gap="sm" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="brand" size="md" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              {!isMobile ? (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              ) : null}
              <Button variant="brand" size="md" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </Inline>
      </Inline>
    </Box>
  );
}
