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
  navGroupBlockClassName,
  navGroupChevronClassName,
  navGroupClassName,
  navGroupIconClassName,
  navGroupLabelClassName,
  navItemClassName,
  navItemCollapsedClassName,
  navItemIconClassName,
  navItemLabelClassName,
  navSubListClassName,
  PopoverPanel,
  shellChrome,
  Stack,
  Text,
  cn,
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
  TriangleAlert,
  CalendarClock,
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
  const notificationMenuRef = useRef<HTMLElement>(null);
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

  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications(
    user?.shopId ?? undefined,
  );

  useEffect(() => {
    if (shop?.name) {
      localStorage.setItem('shopName', shop.name);
    }
  }, [shop]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
    };

    if (userMenuOpen || showNotificationMenu) {
      document.addEventListener('mousedown', handleOutside);
    }

    return () => document.removeEventListener('mousedown', handleOutside);
  }, [userMenuOpen, showNotificationMenu]);

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
              size="sm"
              className={shellChrome.mobileMenuFab}
              onClick={() => setSidebarOpen(true)}
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
              className={
                sidebarOpen
                  ? shellChrome.sidebarHeader
                  : `${shellChrome.sidebarHeader} ${shellChrome.sidebarHeaderCollapsed}`
              }
            >
              <Link
                to="/dashboard"
                className={
                  sidebarOpen
                    ? shellChrome.sidebarBrandLink
                    : `${shellChrome.sidebarBrandLink} ${shellChrome.sidebarBrandLinkCollapsed}`
                }
              >
                <img
                  src={
                    sidebarOpen
                      ? '/assets/logo/STOCKKART-3x.png'
                      : '/assets/logo/stockkart_icon.png'
                  }
                  alt="StockKart"
                  className={
                    sidebarOpen
                      ? shellChrome.sidebarLogo
                      : `${shellChrome.sidebarLogo} ${shellChrome.sidebarLogoCollapsed}`
                  }
                />
              </Link>

              <IconButton
                label="Toggle sidebar"
                size="sm"
                className={
                  sidebarOpen
                    ? shellChrome.sidebarToggle
                    : `${shellChrome.sidebarToggle} ${shellChrome.sidebarToggleCollapsed}`
                }
                onClick={() => setSidebarOpen((s) => !s)}
              >
                <Menu size={18} />
              </IconButton>
            </Inline>

            <Box as="nav" className={shellChrome.sidebarNav}>
              {sidebarOpen ? (
                filteredMenuGroups.map((group) => {
                  const isExpanded =
                    expandedGroups.has(group.id) || isPathInGroup(group.id, currentPath);
                  return (
                    <Box key={group.id} className={navGroupBlockClassName}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={isExpanded}
                        fullWidth
                        align="start"
                        className={navGroupClassName()}
                      >
                        <Box as="span" className={navGroupIconClassName}>
                          <NavIcon name={group.icon} size="sm" />
                        </Box>
                        <Text as="span" variant="micro" className={navGroupLabelClassName}>
                          {group.label}
                        </Text>
                        <ChevronDown
                          size={13}
                          strokeWidth={1.75}
                          className={navGroupChevronClassName(isExpanded)}
                        />
                      </Button>
                      {isExpanded && (
                        <Box className={navSubListClassName}>
                          {group.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={navItemClassName(currentPath === item.path)}
                            >
                              <Box
                                as="span"
                                className={navItemIconClassName(currentPath === item.path)}
                              >
                                <NavIcon name={item.icon} size="sm" />
                              </Box>
                              <Text as="span" variant="micro" className={navItemLabelClassName}>
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
                      className={navItemCollapsedClassName(currentPath === item.path)}
                    >
                      <Box as="span" className={navItemIconClassName(false, true)}>
                        <NavIcon name={item.icon} size="sm" />
                      </Box>
                    </Link>
                  ))}
                </Stack>
              )}
            </Box>

            <Box className={shellChrome.sidebarFooter}>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                align={sidebarOpen ? 'start' : 'center'}
                className={
                  sidebarOpen
                    ? shellChrome.supportToggle
                    : `${shellChrome.supportToggle} ${shellChrome.supportToggleCollapsed}`
                }
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
              >
                <Headphones size={16} className={shellChrome.supportIcon} />
                {sidebarOpen && (
                  <>
                    <Text as="span" variant="micro" className={shellChrome.supportToggleLabel}>
                      Support
                    </Text>
                    {supportOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </>
                )}
              </Button>

              {supportOpen && sidebarOpen && (
                <Box
                  padding="sm"
                  rounded="md"
                  border
                  className={shellChrome.supportPanel}
                  {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
                >
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <Phone size={14} className={shellChrome.supportIcon} />
                        <Text variant="overline" color="secondary">
                          Call us
                        </Text>
                      </Inline>
                      <UiLink href="tel:+919828606899">+91-9828606899</UiLink>
                      <UiLink href="tel:+918800107393">+91-8800107393</UiLink>
                    </Stack>

                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <Mail size={14} className={shellChrome.supportIcon} />
                        <Text variant="overline" color="secondary">
                          Email
                        </Text>
                      </Inline>
                      <UiLink href="mailto:stockkartofficial@gmail.com">
                        stockkartofficial@gmail.com
                      </UiLink>
                    </Stack>

                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        <MessageCircle size={14} className={shellChrome.supportIcon} />
                        <Text variant="overline" color="secondary">
                          Instant online support
                        </Text>
                      </Inline>
                      <Stack gap="sm" mt="sm">
                        <Box padding="sm" rounded="sm" className={shellChrome.chatThread}>
                          {chatMessages.length === 0 ? (
                            <Text variant="caption" color="secondary">
                              Start a conversation. We&apos;ll integrate with backend soon.
                            </Text>
                          ) : (
                            chatMessages.map((m, i) => (
                              <Box
                                key={i}
                                className={`${shellChrome.chatBubble} ${
                                  m.from === 'user'
                                    ? shellChrome.chatBubbleUser
                                    : shellChrome.chatBubbleSupport
                                }`}
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
                            className={shellChrome.chatInput}
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
            className={
              isMobile
                ? `${shellChrome.headerBar} ${shellChrome.headerBarCompact}`
                : shellChrome.headerBar
            }
          >
            <Inline justify="between" align="center" gap="md" height="full" width="full">
              <Text
                as="span"
                role="heading"
                aria-level={1}
                variant="title"
                weight="semibold"
                className={shellChrome.headerTitle}
              >
                {currentPageLabel}
              </Text>

              <Inline align="center" gap="none" className={shellChrome.headerActions}>
                <Inline gap="xs" align="center">
                  <IconButton
                    label="Help for this page"
                    size="sm"
                    shape="circle"
                    className={shellChrome.headerIconButton}
                    onClick={() => {
                      setShowNotificationMenu(false);
                      setContextualHelpOpen(true);
                    }}
                    title="Help for this page"
                  >
                    <Info size={18} aria-hidden />
                  </IconButton>

                  <Box ref={notificationMenuRef} position="relative">
                    <IconButton
                      label="Notifications"
                      size="sm"
                      shape="circle"
                      className={shellChrome.headerIconButton}
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowNotificationMenu((o) => !o);
                      }}
                    >
                      <Bell size={18} aria-hidden />
                      {unreadCount > 0 ? (
                        <Box
                          as="span"
                          className={shellChrome.notificationBadge}
                          aria-label={`${unreadCount} unread notifications`}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Box>
                      ) : null}
                    </IconButton>

                    {showNotificationMenu && (
                      <PopoverPanel variant="notification">
                        <Box className={shellChrome.notificationPanelHeader}>
                          <Text as="h2" className={shellChrome.notificationPanelTitle}>
                            Notifications
                          </Text>
                          <Box className={shellChrome.notificationPanelMeta}>
                            {unreadCount > 0 ? (
                              <Box as="span" className={shellChrome.notificationUnreadCount}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </Box>
                            ) : null}
                            {notifications.length > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={shellChrome.notificationClearBtn}
                                onClick={() => clearAll()}
                              >
                                Clear all
                              </Button>
                            ) : null}
                          </Box>
                        </Box>

                        {notifications.length === 0 ? (
                          <Box className={shellChrome.notificationEmpty}>
                            <Text as="p" className={shellChrome.notificationEmptyTitle}>
                              You’re all caught up
                            </Text>
                            <Text as="p" className={shellChrome.notificationEmptyHint}>
                              Low-stock alerts and reminders will show up here.
                            </Text>
                          </Box>
                        ) : (
                          <Box className={shellChrome.notificationPanelList}>
                            {notifications.map((n) => {
                              const isLowStock = n.type === 'INVENTORY_LOW';
                              return (
                                <Button
                                  key={n.id}
                                  type="button"
                                  variant="ghost"
                                  fullWidth
                                  align="start"
                                  className={cn(
                                    shellChrome.notificationRow,
                                    !n.read && shellChrome.notificationRowUnread,
                                  )}
                                  onClick={() => handleNotificationClick(n.id)}
                                >
                                  <Box
                                    as="span"
                                    className={cn(
                                      shellChrome.notificationTypeIcon,
                                      isLowStock
                                        ? shellChrome.notificationTypeIconLow
                                        : shellChrome.notificationTypeIconReminder,
                                    )}
                                    aria-hidden
                                  >
                                    {isLowStock ? (
                                      <TriangleAlert size={14} strokeWidth={2.25} />
                                    ) : (
                                      <CalendarClock size={14} strokeWidth={2.25} />
                                    )}
                                  </Box>
                                  <Box className={shellChrome.notificationRowBody}>
                                    <Box className={shellChrome.notificationRowTop}>
                                      <Text as="span" className={shellChrome.notificationRowTitle}>
                                        {n.title}
                                      </Text>
                                      {!n.read ? (
                                        <Box className={shellChrome.unreadDot} aria-hidden />
                                      ) : null}
                                    </Box>
                                    {n.message ? (
                                      <Text as="p" className={shellChrome.notificationRowMessage}>
                                        {n.message}
                                      </Text>
                                    ) : null}
                                  </Box>
                                </Button>
                              );
                            })}
                          </Box>
                        )}
                      </PopoverPanel>
                    )}
                  </Box>

                  <IconButton
                    label="Keyboard shortcuts"
                    size="sm"
                    shape="circle"
                    className={shellChrome.headerIconButton}
                    onClick={() => setShortcutsHelpOpen(true)}
                    title={`Keyboard shortcuts (${DASHBOARD_HOTKEY.shortcutsHelp})`}
                  >
                    <Keyboard size={18} aria-hidden />
                  </IconButton>
                </Inline>

                <Box aria-hidden className={shellChrome.headerDivider} />

                <Inline gap="sm" align="center" minWidth="0">
                  <ThemeToggle
                    size="sm"
                    variant="outline"
                    className={shellChrome.headerThemeToggle}
                  />

                  <Box ref={userMenuRef} position="relative" minWidth="0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      disabled={isLoading}
                      className={shellChrome.headerUserTrigger}
                    >
                      <Avatar name={user?.name || user?.email || 'User'} size="sm" />
                      <Text as="span" variant="caption" weight="medium" truncate>
                        {user?.name || user?.email || 'User'}
                      </Text>
                    </Button>

                    {userMenuOpen && (
                      <PopoverPanel variant="userMenu">
                        <Box className={shellChrome.menuSection}>
                          <Inline gap="md" align="center">
                            <Avatar name={user?.name || user?.email || 'User'} size="md" />
                            <Stack gap="none" minWidth="0">
                              <Text as="p" className={shellChrome.menuUserName}>
                                {user?.name || 'User'}
                              </Text>
                              {user?.email ? (
                                <Text as="p" className={shellChrome.menuUserEmail}>
                                  {user.email}
                                </Text>
                              ) : null}
                            </Stack>
                          </Inline>
                        </Box>

                        <UserMenuShopSection onClose={() => setUserMenuOpen(false)} />

                        <Button
                          type="button"
                          variant="ghost"
                          fullWidth
                          align="start"
                          leftIcon={<User size={16} aria-hidden />}
                          className={`${shellChrome.menuItem} ${shellChrome.menuItemBordered}`}
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/dashboard/profile');
                          }}
                        >
                          View profile
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          fullWidth
                          align="start"
                          leftIcon={<LogOut size={16} aria-hidden />}
                          className={`${shellChrome.menuItem} ${shellChrome.menuItemDanger}`}
                          onClick={handleLogout}
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
          className={shellChrome.mainSurface}
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
            <CenteredLoader minHeight="8rem" />
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
