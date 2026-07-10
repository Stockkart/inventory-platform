import { useEffect, useState } from 'react';
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

const logoImgProps = {
  as: 'img',
  src: '/assets/logo/STOCKKART-3x.png',
  alt: 'StockKart',
  style: { height: 44, width: 'auto', maxWidth: 180, objectFit: 'contain' as const },
} as unknown as BoxProps;

function useCompactHeader() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

export function JourneyHeader() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const compact = useCompactHeader();

  return (
    <Box
      as="header"
      position="fixed"
      zIndex="sticky"
      bg="elevated"
      padding="sm"
      width="full"
      style={{
        top: 0,
        left: 0,
        right: 0,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <Inline maxWidth="xl" mx="auto" justify="between" width="full" padding="sm" gap="md">
        <Link to="/">
          <Box {...logoImgProps} />
        </Link>

        {!compact ? (
          <Box as="nav" display="flex" gap="lg" align="center" justify="center">
            <UiLink href="/#features">Features</UiLink>
            <UiLink href="/#pricing">Pricing</UiLink>
            <UiLink href="/#about">About</UiLink>
          </Box>
        ) : null}

        <Inline gap="sm" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="solid" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              {!compact ? (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              ) : null}
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
