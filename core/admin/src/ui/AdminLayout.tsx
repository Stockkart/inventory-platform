import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { KeyRound, LogOut } from 'lucide-react';
import {
  AppShell,
  Box,
  Button,
  CenteredLoader,
  Inline,
  Stack,
  Text,
  ThemeToggle,
  navItemClassName,
  navItemIconClassName,
  navItemLabelClassName,
  shellChrome,
} from '@inventory-platform/ui-kit';
import { ADMIN_NAV } from '../nav';
import { useAdminLogoutMutation } from '../queries/hooks';
import { ADMIN_PATHS } from '../session/adminGuard';
import { useAdminSession } from '../session/useAdminSession';

/** Admin app chrome: its own header and tool sidebar, no shop menus. */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, checking } = useAdminSession('app');
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAdminLogoutMutation();

  if (checking || !admin) {
    return <CenteredLoader label="Checking your admin session…" />;
  }

  const active = ADMIN_NAV.find((item) => location.pathname.startsWith(item.path));

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => navigate(ADMIN_PATHS.login, { replace: true }),
    });

  return (
    <AppShell
      sidebar={
        <>
          <Inline align="center" width="full" className={shellChrome.sidebarHeader}>
            <Link to={ADMIN_PATHS.home} className={shellChrome.sidebarBrandLink}>
              <img
                src="/assets/logo/STOCKKART-3x.png"
                alt="StockKart"
                className={shellChrome.sidebarLogo}
              />
            </Link>
          </Inline>
          <Box as="nav" className={shellChrome.sidebarNav}>
            <Stack gap="xs" padding="sm">
              {ADMIN_NAV.map((item) => {
                const isActive = item === active;
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} className={navItemClassName(isActive)}>
                    <Box as="span" className={navItemIconClassName(isActive)}>
                      <Icon size={16} />
                    </Box>
                    <Text as="span" variant="micro" className={navItemLabelClassName}>
                      {item.label}
                    </Text>
                  </Link>
                );
              })}
            </Stack>
          </Box>
        </>
      }
      header={
        <Inline justify="between" align="center" width="full" className={shellChrome.headerBar}>
          <Text as="h1" className={shellChrome.headerTitle}>
            StockKart Admin{active ? ` · ${active.label}` : ''}
          </Text>
          <Inline align="center" gap="sm" className={shellChrome.headerActions}>
            <Stack gap="none" align="end">
              <Text variant="caption" weight="semibold">
                {admin.name}
              </Text>
              <Text variant="caption" color="secondary">
                {admin.email}
              </Text>
            </Stack>
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<KeyRound size={14} />}
              onClick={() => navigate(ADMIN_PATHS.changePassword)}
            >
              Change password
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LogOut size={14} />}
              loading={logout.isPending}
              onClick={signOut}
            >
              Sign out
            </Button>
          </Inline>
        </Inline>
      }
    >
      {children}
    </AppShell>
  );
}
