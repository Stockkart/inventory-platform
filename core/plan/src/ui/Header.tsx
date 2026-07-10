import { Link as RouterLink } from 'react-router';
import {
  Box,
  Inline,
  Link,
  Text,
  ThemeToggle,
  useMatchMedia,
  type BoxProps,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';

const logoStyle = {
  height: 44,
  width: 'auto',
  maxWidth: 180,
  objectFit: 'contain' as const,
  flexShrink: 0,
};

const logoImgProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  style: logoStyle,
} as unknown as BoxProps;

const getStartedBtnStyle = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  color: '#ffffff',
  borderRadius: 999,
  textDecoration: 'none',
  display: 'inline-block',
} as const;

const signInBtnStyle = {
  textDecoration: 'none',
  color: 'var(--link)',
} as const;

export function Header() {
  const { isAuthenticated } = useAuthStore();
  const isMobile = useMatchMedia('(max-width: 768px)');

  return (
    <Box
      as="header"
      padding="sm"
      width="full"
      style={{
        background: 'var(--bg-header)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <Inline maxWidth="xl" mx="auto" width="full" padding="sm" align="center" justify="between">
        <RouterLink to="/">
          <Box {...logoImgProps} />
        </RouterLink>

        {!isMobile ? (
          <Box as="nav" display="flex" gap="lg" align="center" justify="center">
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#about">About</Link>
          </Box>
        ) : null}

        <Inline gap="md" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <RouterLink
              to="/dashboard"
              style={{
                ...getStartedBtnStyle,
                ...(isMobile ? { boxShadow: '0 6px 14px rgba(37, 99, 235, 0.5)' } : {}),
              }}
            >
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
              {!isMobile ? (
                <RouterLink to="/login" style={signInBtnStyle}>
                  <Text as="span" weight="semibold">
                    Sign In
                  </Text>
                </RouterLink>
              ) : null}
              <RouterLink
                to="/signup"
                style={{
                  ...getStartedBtnStyle,
                  ...(isMobile ? { boxShadow: '0 6px 14px rgba(37, 99, 235, 0.5)' } : {}),
                }}
              >
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
