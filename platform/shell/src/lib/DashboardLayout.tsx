import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  useAuthStore,
  useShopCapabilitiesStore,
  useShopAccessStore,
} from '@inventory-platform/session';
import { useNotifications } from './useNotifications';
import { shopsApi } from '@inventory-platform/user/shops';
import type { DashboardLayoutProps } from '@inventory-platform/shell/types';
import type { Location as LocationType } from '@inventory-platform/user/types';
import { ThemeToggle } from './ThemeToggle';
import {
  Alert,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  CenteredLoader,
  FormField,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  Link as UiLink,
  Modal,
  navItemClassName,
  PopoverPanel,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { ToastProvider } from './ToastProvider';
import { getDashboardMenuGroupsWithCapabilities } from './capabilityNav';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import {
  DASHBOARD_HOTKEY,
  getDashboardModLabel,
  isModLetter,
  isQuickNavSlash,
  isShortcutsHelp,
} from './dashboardHotkeys';
import { UserMenuShopSection } from './UserMenuShopSection';
import {
  favoriteShortcutMatches,
  loadFavoritePageShortcuts,
  refreshFavoriteLabels,
  saveFavoritePageShortcuts,
} from './favoritePageShortcuts';
import type { FavoritePageShortcut } from './favoritePageShortcuts';
import {
  KEYBOARD_NAV_GRID,
  KEYBOARD_NAV_SKIP,
  runFormKeyboardNavigation,
  shouldSkipGlobalMainKeyboardNav,
} from './formKeyboardNav';
import {
  Menu,
  Bell,
  Headphones,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Info,
  LogOut,
  User,
} from 'lucide-react';
import { ContextualHelpPanel } from './ContextualHelpPanel';
import { NavIcon } from './NavIcon';

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

const navLinkLayoutStyle = {
  display: 'flex',
  alignItems: 'center',
  borderRadius: 8,
  fontSize: '0.875rem',
  lineHeight: 1.25,
  boxSizing: 'border-box' as const,
};

export function DashboardLayout({
  children,
  verticalPlugin = null,
  baseMenuGroups,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, shop, logout, isLoading } = useAuthStore();
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );

  useEffect(() => {
    if (user?.shopId) {
      void fetchCapabilities();
      void fetchAccess();
    }
  }, [user?.shopId, fetchCapabilities, fetchAccess]);

  useEffect(() => {
    const onFocus = () => {
      if (user?.shopId) {
        void fetchAccess({ force: true });
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.shopId, fetchAccess]);

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 768 ? false : true,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [contextualHelpOpen, setContextualHelpOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['overview', 'products']),
  );
  const [supportOpen, setSupportOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ text: string; from: 'user' | 'support' }[]>(
    [],
  );
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTagline, setEditTagline] = useState('');
  const [editLocation, setEditLocation] = useState<LocationType>({
    primaryAddress: '',
    secondaryAddress: '',
    state: '',
    city: '',
    pin: '',
    country: 'IND',
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [favoritePageShortcuts, setFavoritePageShortcuts] = useState<FavoritePageShortcut[]>(() =>
    loadFavoritePageShortcuts(),
  );

  const userMenuRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  const modLabel = useMemo(() => getDashboardModLabel(), []);

  const filteredMenuGroups = useMemo(
    () =>
      getDashboardMenuGroupsWithCapabilities(
        baseMenuGroups,
        user?.role,
        shopCapabilities ?? null,
        shopAccess ?? null,
        verticalPlugin ?? null,
      ),
    [baseMenuGroups, user?.role, shopCapabilities, shopAccess, verticalPlugin],
  );

  const navRowsForPalette = useMemo(
    () =>
      filteredMenuGroups.flatMap((group) =>
        group.items.map((item) => ({ ...item, groupLabel: group.label })),
      ),
    [filteredMenuGroups],
  );

  const favoritesNav = useMemo(
    () => refreshFavoriteLabels(favoritePageShortcuts, navRowsForPalette),
    [favoritePageShortcuts, navRowsForPalette],
  );

  useEffect(() => {
    saveFavoritePageShortcuts(favoritePageShortcuts);
  }, [favoritePageShortcuts]);

  useEffect(() => {
    const allowed = new Set(navRowsForPalette.map((r) => r.path));
    setFavoritePageShortcuts((prev) => {
      const next = prev.filter((f) => allowed.has(f.path));
      if (next.length === prev.length) return prev;
      return refreshFavoriteLabels(next, navRowsForPalette);
    });
  }, [navRowsForPalette]);

  const { notifications, unreadCount, markAsRead } = useNotifications(user?.shopId ?? undefined);

  useEffect(() => {
    if (shop?.name) {
      localStorage.setItem('shopName', shop.name);
    }
  }, [shop]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }

    return () => document.removeEventListener('mousedown', handleOutside);
  }, [userMenuOpen]);

  const handleNotificationClick = useCallback(
    (id: string) => {
      const n = notifications.find((n) => n.id === id);
      if (!n) return;

      markAsRead(id);

      if (n.type === 'REMINDER_DUE') {
        navigate('/dashboard/reminders', {
          state: { fromNotification: true, reminderId: id },
        });
      }

      if (n.type === 'INVENTORY_LOW') {
        navigate('/dashboard/inventory-alert', {
          state: { fromNotification: true, inventoryId: id },
        });
      }

      setShowNotificationMenu(false);
    },
    [notifications, markAsRead, navigate],
  );

  const currentPath = location.pathname;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModLetter(e, DASHBOARD_HOTKEY.quickNavToggleModKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        setShortcutsHelpOpen(false);
        return;
      }
      if (commandPaletteOpen || shortcutsHelpOpen) return;

      const inField = isTypingInField(e.target);
      if (isModLetter(e, DASHBOARD_HOTKEY.toggleSidebarModKey)) {
        if (inField) return;
        e.preventDefault();
        setSidebarOpen((s) => !s);
        return;
      }
      if (!inField && isQuickNavSlash(e)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (!inField && isShortcutsHelp(e)) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
        return;
      }
      if (!inField) {
        const fav = favoritesNav.find((f) => favoriteShortcutMatches(e, f));
        if (fav) {
          e.preventDefault();
          navigate(fav.path);
        }
      } else {
        const fav = favoritesNav.find(
          (f) => f.binding.kind === 'fn' && favoriteShortcutMatches(e, f),
        );
        if (fav) {
          e.preventDefault();
          navigate(fav.path);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [commandPaletteOpen, shortcutsHelpOpen, favoritesNav, navigate]);

  const allMenuItems = useMemo(
    () => filteredMenuGroups.flatMap((g) => g.items),
    [filteredMenuGroups],
  );

  const currentPageLabel = useMemo(() => {
    const exact = allMenuItems.find((i) => i.path === currentPath);
    if (exact) return exact.label;
    const prefixMatch = allMenuItems
      .filter(
        (i) =>
          currentPath === i.path ||
          (i.path !== '/dashboard' && currentPath.startsWith(`${i.path}/`)),
      )
      .sort((a, b) => b.path.length - a.path.length)[0];
    return prefixMatch?.label ?? 'Dashboard';
  }, [allMenuItems, currentPath]);

  const isPathInGroup = useCallback(
    (groupId: string, path: string) => {
      const group = filteredMenuGroups.find((g) => g.id === groupId);
      return group?.items.some((i) => i.path === path) ?? false;
    },
    [filteredMenuGroups],
  );

  useEffect(() => {
    const groupWithPath = filteredMenuGroups.find((g) =>
      g.items.some((i) => i.path === currentPath),
    );
    if (groupWithPath) {
      setExpandedGroups(new Set([groupWithPath.id]));
    }
  }, [currentPath, filteredMenuGroups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditError(null);
  }, []);

  useEffect(() => {
    if (!editModalOpen || !user?.shopId) return;
    setEditLoading(true);
    setEditError(null);
    shopsApi
      .getShop(user.shopId)
      .then((shop) => {
        setEditTagline(shop.tagline ?? '');
        setEditLocation(
          shop.location
            ? {
                primaryAddress: shop.location.primaryAddress ?? '',
                secondaryAddress: shop.location.secondaryAddress ?? '',
                state: shop.location.state ?? '',
                city: shop.location.city ?? '',
                pin: shop.location.pin ?? '',
                country: shop.location.country ?? 'IND',
              }
            : {
                primaryAddress: '',
                secondaryAddress: '',
                state: '',
                city: '',
                pin: '',
                country: 'IND',
              },
        );
      })
      .catch((err) => {
        setEditError(err instanceof Error ? err.message : 'Failed to load shop');
      })
      .finally(() => setEditLoading(false));
  }, [editModalOpen, user?.shopId]);

  const handleSaveEdit = useCallback(async () => {
    if (!user?.shopId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await shopsApi.updateShop(user.shopId, {
        tagline: editTagline.trim() || undefined,
        location: {
          primaryAddress: editLocation.primaryAddress.trim(),
          secondaryAddress: editLocation.secondaryAddress?.trim() || undefined,
          state: editLocation.state.trim(),
          city: editLocation.city.trim(),
          pin: editLocation.pin.trim(),
          country: editLocation.country.trim() || 'IND',
        },
      });
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update shop');
    } finally {
      setEditSaving(false);
    }
  }, [user?.shopId, editTagline, editLocation, closeEditModal]);

  const handleChatSend = () => {
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [...prev, { text: chatMessage.trim(), from: 'user' }]);
    setChatMessage('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          text: 'Thanks for reaching out! Our team will respond shortly. (Chat integration coming soon)',
          from: 'support',
        },
      ]);
    }, 500);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        navRows={navRowsForPalette}
        modLabel={modLabel}
      />
      <KeyboardShortcutsModal
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
        modLabel={modLabel}
        navRows={navRowsForPalette}
        favorites={favoritesNav}
        onFavoritesChange={(next) =>
          setFavoritePageShortcuts(refreshFavoriteLabels(next, navRowsForPalette))
        }
      />
      <ContextualHelpPanel
        open={contextualHelpOpen}
        onClose={() => setContextualHelpOpen(false)}
        currentPath={currentPath}
        pageLabel={currentPageLabel}
      />
      <ToastProvider />
      <AppShell
        collapsed={!sidebarOpen}
        mobileOpen={sidebarOpen && isMobile}
        onMobileClose={() => setSidebarOpen(false)}
        mobileMenuButton={
          !sidebarOpen && isMobile ? (
            <IconButton
              label="Open menu"
              onClick={() => setSidebarOpen(true)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                color: 'var(--text-primary)',
              }}
            >
              <Menu size={18} />
            </IconButton>
          ) : undefined
        }
        sidebar={
          <>
            <Inline
              justify={sidebarOpen ? 'between' : 'center'}
              align="center"
              gap="xs"
              width="full"
              style={{
                boxSizing: 'border-box',
                height: 'var(--header-height, 60px)',
                minHeight: 'var(--header-height, 60px)',
                padding: sidebarOpen ? '0 1rem' : '0.5rem',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0,
                flexDirection: sidebarOpen ? 'row' : 'column',
              }}
            >
              <Link
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: sidebarOpen ? 1 : undefined,
                  minWidth: 0,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  order: sidebarOpen ? undefined : 1,
                }}
              >
                <img
                  src={
                    sidebarOpen
                      ? '/assets/logo/STOCKKART-3x.png'
                      : '/assets/logo/stockkart_icon.png'
                  }
                  alt="StockKart"
                  style={{
                    height: 32,
                    width: 'auto',
                    maxWidth: sidebarOpen ? 140 : 36,
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
              </Link>

              <IconButton
                label="Toggle sidebar"
                onClick={() => setSidebarOpen((s) => !s)}
                style={{
                  order: sidebarOpen ? undefined : 2,
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  flexShrink: 0,
                }}
              >
                <Menu size={18} />
              </IconButton>
            </Inline>

            <Box
              as="nav"
              style={{
                flex: 1,
                padding: '0.5rem 0',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {sidebarOpen ? (
                filteredMenuGroups.map((group) => {
                  const isExpanded =
                    expandedGroups.has(group.id) || isPathInGroup(group.id, currentPath);
                  return (
                    <Box key={group.id} style={{ marginBottom: '0.125rem' }}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={isExpanded}
                        fullWidth
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: 'calc(100% - 0.5rem)',
                          padding: '0.45rem 0.75rem',
                          margin: '0 0.25rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          borderRadius: 6,
                          justifyContent: 'flex-start',
                        }}
                      >
                        <Box
                          display="flex"
                          align="center"
                          justify="center"
                          style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.9 }}
                        >
                          <NavIcon name={group.icon} size="sm" />
                        </Box>
                        <Text
                          as="span"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {group.label}
                        </Text>
                        <Text
                          as="span"
                          style={{
                            fontSize: '0.75rem',
                            lineHeight: 1,
                            opacity: 0.55,
                            flexShrink: 0,
                            transform: isExpanded ? 'rotate(180deg)' : undefined,
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          ▾
                        </Text>
                      </Button>
                      {isExpanded && (
                        <Box
                          style={{
                            padding: '0.125rem 0 0.25rem 0.5rem',
                            margin: '0 0.5rem 0.25rem 1.25rem',
                            borderLeft: '2px solid var(--border-color)',
                          }}
                        >
                          {group.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={navItemClassName(currentPath === item.path)}
                              style={{
                                ...navLinkLayoutStyle,
                                gap: '0.625rem',
                                padding: '0.5rem 0.625rem',
                                margin: '0.125rem 0',
                              }}
                            >
                              <Box
                                display="flex"
                                align="center"
                                justify="center"
                                style={{ width: 18, height: 18, flexShrink: 0, color: 'inherit' }}
                              >
                                <NavIcon name={item.icon} size="sm" />
                              </Box>
                              <Text as="span" style={{ whiteSpace: 'nowrap' }}>
                                {item.label}
                              </Text>
                            </Link>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Stack gap="xs" padding="sm">
                  {allMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={navItemClassName(currentPath === item.path)}
                      style={{
                        ...navLinkLayoutStyle,
                        justifyContent: 'center',
                        padding: '0.6rem',
                      }}
                    >
                      <Box
                        display="flex"
                        align="center"
                        justify="center"
                        style={{ width: 18, height: 18, flexShrink: 0, color: 'inherit' }}
                      >
                        <NavIcon name={item.icon} size="sm" />
                      </Box>
                    </Link>
                  ))}
                </Stack>
              )}
            </Box>

            <Box
              style={{
                flexShrink: 0,
                marginTop: 'auto',
                borderTop: '1px solid var(--border-color)',
                padding: '0.5rem',
              }}
            >
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => {
                  if (!sidebarOpen) {
                    setSidebarOpen(true);
                    setSupportOpen(true);
                  } else {
                    setSupportOpen((o) => !o);
                  }
                }}
                aria-expanded={supportOpen}
                title="Support"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: sidebarOpen ? '0.55rem 0.75rem' : '0.5rem',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  borderRadius: 8,
                }}
              >
                <Headphones size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && (
                  <>
                    <Text as="span" style={{ flex: 1, textAlign: 'left' }}>
                      Support
                    </Text>
                    {supportOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </>
                )}
              </Button>

              {supportOpen && sidebarOpen && (
                <Box
                  padding="sm"
                  rounded="md"
                  border
                  style={{
                    marginTop: '0.5rem',
                    background: 'var(--bg-primary)',
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                  {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
                >
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <Phone size={14} style={{ opacity: 0.8 }} />
                        <Text
                          variant="caption"
                          weight="semibold"
                          color="secondary"
                          style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontSize: '0.7rem',
                          }}
                        >
                          Call us
                        </Text>
                      </Inline>
                      <UiLink href="tel:+919828606899">+91-9828606899</UiLink>
                      <UiLink href="tel:+918800107393">+91-8800107393</UiLink>
                    </Stack>

                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <Mail size={14} style={{ opacity: 0.8 }} />
                        <Text
                          variant="caption"
                          weight="semibold"
                          color="secondary"
                          style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontSize: '0.7rem',
                          }}
                        >
                          Email
                        </Text>
                      </Inline>
                      <UiLink href="mailto:stockkartofficial@gmail.com">
                        stockkartofficial@gmail.com
                      </UiLink>
                    </Stack>

                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <MessageCircle size={14} style={{ opacity: 0.8 }} />
                        <Text
                          variant="caption"
                          weight="semibold"
                          color="secondary"
                          style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontSize: '0.7rem',
                          }}
                        >
                          Instant online support
                        </Text>
                      </Inline>
                      <Stack gap="sm" style={{ marginTop: '0.5rem' }}>
                        <Box
                          padding="sm"
                          rounded="sm"
                          style={{
                            minHeight: 60,
                            maxHeight: 120,
                            overflowY: 'auto',
                            background: 'var(--bg-secondary)',
                          }}
                        >
                          {chatMessages.length === 0 ? (
                            <Text variant="caption" color="secondary">
                              Start a conversation. We&apos;ll integrate with backend soon.
                            </Text>
                          ) : (
                            chatMessages.map((m, i) => (
                              <Box
                                key={i}
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 6,
                                  marginBottom: '0.35rem',
                                  background:
                                    m.from === 'user'
                                      ? 'rgba(59, 130, 246, 0.2)'
                                      : 'var(--bg-card)',
                                  color:
                                    m.from === 'user'
                                      ? 'var(--text-primary)'
                                      : 'var(--text-secondary)',
                                  marginLeft: m.from === 'user' ? '1rem' : undefined,
                                  marginRight: m.from === 'support' ? '1rem' : undefined,
                                }}
                              >
                                {m.text}
                              </Box>
                            ))
                          )}
                        </Box>
                        <Inline gap="sm" width="full">
                          <Input
                            type="text"
                            placeholder="Type your message..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                            style={{ flex: 1, fontSize: '0.85rem' }}
                          />
                          <Button
                            type="button"
                            variant="solid"
                            size="sm"
                            onClick={handleChatSend}
                            aria-label="Send message"
                          >
                            Send
                          </Button>
                        </Inline>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Box>
          </>
        }
        header={
          <Box
            style={{
              backgroundColor: 'var(--bg-header)',
              borderBottom: '1px solid var(--border-color)',
              boxSizing: 'border-box',
              height: 'var(--header-height, 60px)',
              minHeight: 'var(--header-height, 60px)',
              padding: isMobile ? '0.5rem 0.75rem' : '0 1rem',
              transition: 'background-color 0.3s ease, border-color 0.3s ease',
            }}
          >
            <Inline justify="between" align="center" gap="md" height="full" width="full">
              <Text
                as="span"
                role="heading"
                aria-level={1}
                variant="title"
                weight="semibold"
                style={{ margin: 0, letterSpacing: '-0.01em' }}
              >
                {currentPageLabel}
              </Text>

              <Inline align="center" gap="none" style={{ flexShrink: 0 }}>
                <Inline gap="xs" align="center">
                  <IconButton
                    label="Help for this page"
                    size="sm"
                    onClick={() => {
                      setShowNotificationMenu(false);
                      setContextualHelpOpen(true);
                    }}
                    title="Help for this page"
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: 'var(--sk-radius-full, 9999px)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Info size={18} aria-hidden />
                  </IconButton>

                  <Box position="relative">
                    <IconButton
                      label="Notifications"
                      size="sm"
                      onClick={() => setShowNotificationMenu((o) => !o)}
                      style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        borderRadius: 'var(--sk-radius-full, 9999px)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Bell size={18} aria-hidden />
                      {unreadCount > 0 && (
                        <Box style={{ position: 'absolute', top: -2, right: -2 }}>
                          <Badge variant="danger">{unreadCount}</Badge>
                        </Box>
                      )}
                    </IconButton>

                    {showNotificationMenu && (
                      <PopoverPanel
                        style={{
                          top: '110%',
                          right: 0,
                          marginTop: '0.5rem',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
                          minWidth: 260,
                          maxWidth: 320,
                          maxHeight: 320,
                          overflowY: 'auto',
                          padding: '0.5rem 0',
                        }}
                      >
                        {notifications.length === 0 ? (
                          <Text
                            variant="caption"
                            color="secondary"
                            align="center"
                            style={{ display: 'block', padding: '0.75rem 1rem' }}
                          >
                            No notifications
                          </Text>
                        ) : (
                          notifications.map((n) => (
                            <Button
                              key={n.id}
                              type="button"
                              variant="ghost"
                              fullWidth
                              onClick={() => handleNotificationClick(n.id)}
                              style={{
                                textAlign: 'left',
                                padding: '0.6rem 1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.15rem',
                                alignItems: 'stretch',
                              }}
                            >
                              <Inline justify="between" align="center" width="full">
                                <Text variant="caption" weight="semibold">
                                  {n.title}
                                </Text>
                                {!n.read && (
                                  <Box
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 999,
                                      backgroundColor: '#22c55e',
                                      flexShrink: 0,
                                      marginLeft: '0.5rem',
                                    }}
                                  />
                                )}
                              </Inline>
                              <Text
                                variant="caption"
                                color="secondary"
                                style={{ whiteSpace: 'pre-line' }}
                              >
                                {n.message}
                              </Text>
                            </Button>
                          ))
                        )}
                      </PopoverPanel>
                    )}
                  </Box>

                  <IconButton
                    label="Keyboard shortcuts"
                    size="sm"
                    onClick={() => setShortcutsHelpOpen(true)}
                    title={`Keyboard shortcuts (${DASHBOARD_HOTKEY.shortcutsHelp})`}
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: 'var(--sk-radius-full, 9999px)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Keyboard size={18} aria-hidden />
                  </IconButton>
                </Inline>

                <Box
                  aria-hidden
                  style={{
                    width: 1,
                    height: '1.625rem',
                    margin: '0 0.75rem',
                    background: 'var(--border-color)',
                    flexShrink: 0,
                  }}
                />

                <Inline gap="sm" align="center" style={{ minWidth: 0 }}>
                  <ThemeToggle
                    size="sm"
                    variant="outline"
                    style={{
                      height: '2.25rem',
                      minWidth: '2.25rem',
                      padding: '0 0.75rem',
                      borderRadius: 'var(--sk-radius-full, 9999px)',
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                    }}
                  />

                  <Box ref={userMenuRef} position="relative" style={{ minWidth: 0 }}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        height: '2.25rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0 0.75rem 0 0.25rem',
                        borderRadius: 'var(--sk-radius-full, 9999px)',
                        fontSize: '0.8125rem',
                        maxWidth: '12rem',
                        minWidth: 0,
                      }}
                    >
                      <Avatar name={user?.name || user?.email || 'User'} size="sm" />
                      <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        truncate
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user?.name || user?.email || 'User'}
                      </Text>
                    </Button>

                    {userMenuOpen && (
                      <PopoverPanel
                        style={{
                          right: 0,
                          top: 'calc(100% + 8px)',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 12,
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                          minWidth: 280,
                          maxWidth: 320,
                          overflow: 'hidden',
                        }}
                      >
                        <Box padding="md" style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <Inline gap="md" align="center">
                            <Avatar name={user?.name || user?.email || 'User'} size="md" />
                            <Stack gap="none">
                              <Text weight="semibold">{user?.name || 'User'}</Text>
                              <Text
                                variant="caption"
                                color="secondary"
                                style={{ wordBreak: 'break-all' }}
                              >
                                {user?.email}
                              </Text>
                            </Stack>
                          </Inline>
                        </Box>

                        <UserMenuShopSection onClose={() => setUserMenuOpen(false)} />

                        <Button
                          type="button"
                          variant="ghost"
                          fullWidth
                          leftIcon={<User size={16} aria-hidden />}
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/dashboard/profile');
                          }}
                          style={{
                            justifyContent: 'flex-start',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            borderTop: '1px solid var(--border-color)',
                            borderRadius: 0,
                          }}
                        >
                          View profile
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          fullWidth
                          leftIcon={<LogOut size={16} aria-hidden />}
                          onClick={handleLogout}
                          style={{
                            justifyContent: 'flex-start',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            color: '#ef4444',
                            borderRadius: 0,
                          }}
                        >
                          Logout
                        </Button>
                      </PopoverPanel>
                    )}
                  </Box>
                </Inline>
              </Inline>
            </Inline>
          </Box>
        }
      >
        <Box
          as="main"
          ref={mainContentRef}
          style={{
            minHeight: '100%',
            backgroundColor: 'var(--sk-color-bg-surface, var(--bg-tertiary))',
            transition: 'background-color 0.3s ease',
          }}
          onKeyDownCapture={(e) => {
            const mainEl = mainContentRef.current;
            if (!mainEl) return;
            const active = document.activeElement;
            if (active?.closest(`[data-keyboard-nav="${KEYBOARD_NAV_GRID}"]`)) {
              return;
            }
            if (shouldSkipGlobalMainKeyboardNav(active)) return;
            runFormKeyboardNavigation(e, mainEl, 'list');
          }}
        >
          {children}
        </Box>
      </AppShell>

      <Modal open={editModalOpen} onClose={closeEditModal}>
        <Modal.Header title="Edit tagline & location" onClose={closeEditModal} />
        <Modal.Body>
          {editLoading ? (
            <CenteredLoader />
          ) : (
            <Stack gap="md">
              {editError ? <Alert variant="danger">{editError}</Alert> : null}
              <Stack gap="md">
                <FormField label="Tagline (optional)" id="edit-tagline">
                  <Input
                    id="edit-tagline"
                    type="text"
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    placeholder="e.g. Your Trusted Pharmacy"
                  />
                </FormField>
                <Label>Location</Label>
                <Input
                  type="text"
                  placeholder="Primary address *"
                  value={editLocation.primaryAddress}
                  onChange={(e) =>
                    setEditLocation((prev) => ({
                      ...prev,
                      primaryAddress: e.target.value,
                    }))
                  }
                />
                <Input
                  type="text"
                  placeholder="Secondary address"
                  value={editLocation.secondaryAddress ?? ''}
                  onChange={(e) =>
                    setEditLocation((prev) => ({
                      ...prev,
                      secondaryAddress: e.target.value,
                    }))
                  }
                />
                <Grid columns={2} gap="md">
                  <Input
                    type="text"
                    placeholder="City *"
                    value={editLocation.city}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="text"
                    placeholder="State *"
                    value={editLocation.state}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid columns={2} gap="md">
                  <Input
                    type="text"
                    placeholder="PIN *"
                    value={editLocation.pin}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        pin: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="text"
                    placeholder="Country *"
                    value={editLocation.country}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  />
                </Grid>
              </Stack>
            </Stack>
          )}
        </Modal.Body>
        {!editLoading && (
          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={handleSaveEdit}
              disabled={editSaving}
              loading={editSaving}
            >
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </>
  );
}
