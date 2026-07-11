import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Inline,
  Link as UiLink,
  ThemeToggle,
  journeyChrome,
} from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';

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
      className={journeyChrome.header}
    >
      <Inline maxWidth="xl" mx="auto" justify="between" width="full" padding="sm" gap="md">
        <Link to="/">
          <img src="/assets/logo/STOCKKART-3x.png" alt="StockKart" className={journeyChrome.logo} />
        </Link>

        {!compact ? (
          <Box as="nav" display="flex" gap="lg" align="center" justify="center">
            <UiLink href="/#features" tone="nav">
              Features
            </UiLink>
            <UiLink href="/#pricing" tone="nav">
              Pricing
            </UiLink>
            <UiLink href="/#about" tone="nav">
              About
            </UiLink>
          </Box>
        ) : null}

        <Inline gap="sm" align="center">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="brand" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              {!compact ? (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              ) : null}
              <Button variant="brand" size="sm" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </Inline>
      </Inline>
    </Box>
  );
}
