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
import styles from './DashboardLayout.module.css';
import { ThemeToggle } from './ThemeToggle';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  CenteredLoader,
  Divider,
  FormField,
  IconButton,
  Input,
  Label,
  Link as UiLink,
  Modal,
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

  //const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // Reminder notifications (ALL logic lives in hook)
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.shopId ?? undefined);

  useEffect(() => {
    if (shop?.name) {
      localStorage.setItem('shopName', shop.name);
    }
  }, [shop]);

  // Close user menu on outside click
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
    // Placeholder: simulate support reply (will integrate with backend later)
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

  return (
    <Box className={`${styles.dashboard} ${sidebarOpen ? '' : styles.dashboardCollapsed}`}>
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
      {!sidebarOpen && window.innerWidth <= 768 && (
        <IconButton
          label="Open menu"
          className={styles.mobileMenuFloating}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </IconButton>
      )}
      {sidebarOpen && (
        <Box
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Box className={styles.dashboardBody}>
        {/* Sidebar */}
        <Box className={styles.sidebarColumn}>
          <Box
            as="aside"
            className={`${styles.sidebar} ${
              sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed
            }`}
          >
            <Box className={styles.sidebarHeader}>
              <Link to="/dashboard" className={styles.logo}>
                <img
                  src={
                    sidebarOpen
                      ? '/assets/logo/STOCKKART-3x.png'
                      : '/assets/logo/stockkart_icon.png'
                  }
                  alt="StockKart"
                  className={styles.logoImg}
                />
              </Link>

              <IconButton
                label="Toggle sidebar"
                className={styles.toggleBtn}
                onClick={() => setSidebarOpen((s) => !s)}
              >
                <Menu size={18} />
              </IconButton>
            </Box>

            <Box as="nav" className={styles.nav}>
              {sidebarOpen ? (
                filteredMenuGroups.map((group) => {
                  const isExpanded =
                    expandedGroups.has(group.id) || isPathInGroup(group.id, currentPath);
                  return (
                    <Box key={group.id} className={styles.navGroup}>
                      <Box
                        as="button"
                        className={styles.navGroupHeader}
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={isExpanded}
                      >
                        <Box as="span" className={styles.navGroupIcon}>
                          <NavIcon name={group.icon} size="sm" />
                        </Box>
                        <Box as="span" className={styles.navGroupLabel}>
                          {group.label}
                        </Box>
                        <Box
                          as="span"
                          className={`${styles.navGroupChevron} ${
                            isExpanded ? styles.navGroupChevronOpen : ''
                          }`}
                        >
                          ▾
                        </Box>
                      </Box>
                      {isExpanded && (
                        <Box className={styles.navGroupItems}>
                          {group.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`${styles.navItem} ${
                                currentPath === item.path ? styles.active : ''
                              }`}
                            >
                              <Box as="span" className={styles.navIcon}>
                                <NavIcon name={item.icon} size="sm" />
                              </Box>
                              <Box as="span" className={styles.navLabel}>
                                {item.label}
                              </Box>
                            </Link>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Box className={styles.navCollapsed}>
                  {allMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${styles.navItem} ${styles.navItemCollapsed} ${
                        currentPath === item.path ? styles.active : ''
                      }`}
                      title={item.label}
                    >
                      <Box as="span" className={styles.navIcon}>
                        <NavIcon name={item.icon} size="sm" />
                      </Box>
                    </Link>
                  ))}
                </Box>
              )}
            </Box>

            {/* Support section at bottom */}
            <Box className={styles.sidebarSupport}>
              <Box
                as="button"
                className={styles.supportToggle}
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
                <Headphones size={18} className={styles.supportIcon} />
                {sidebarOpen && (
                  <Box as="span" className={styles.supportLabel}>
                    Support
                  </Box>
                )}
                {sidebarOpen && (supportOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </Box>

              {supportOpen && (
                <Box
                  className={styles.supportPanel}
                  {...{ 'data-keyboard-nav': KEYBOARD_NAV_SKIP }}
                >
                  {/* Phone */}
                  <Box className={styles.supportSection}>
                    <Phone size={14} className={styles.supportSectionIcon} />
                    <Text as="span" className={styles.supportSectionTitle}>
                      Call us
                    </Text>
                    <UiLink href="tel:+919828606899" className={styles.supportLink}>
                      +91-9828606899
                    </UiLink>
                    <UiLink href="tel:+918800107393" className={styles.supportLink}>
                      +91-8800107393
                    </UiLink>
                  </Box>

                  {/* Email */}
                  <Box className={styles.supportSection}>
                    <Mail size={14} className={styles.supportSectionIcon} />
                    <Text as="span" className={styles.supportSectionTitle}>
                      Email
                    </Text>
                    <UiLink
                      href="mailto:stockkartofficial@gmail.com"
                      className={styles.supportLink}
                    >
                      stockkartofficial@gmail.com
                    </UiLink>
                  </Box>

                  {/* Online chat placeholder */}
                  <Box className={styles.supportSection}>
                    <MessageCircle size={14} className={styles.supportSectionIcon} />
                    <Text as="span" className={styles.supportSectionTitle}>
                      Instant online support
                    </Text>
                    <Box className={styles.chatPlaceholder}>
                      <Box className={styles.chatMessages}>
                        {chatMessages.length === 0 && (
                          <Text as="span" className={styles.chatEmpty}>
                            Start a conversation. We&apos;ll integrate with backend soon.
                          </Text>
                        )}
                        {chatMessages.map((m, i) => (
                          <Box
                            key={i}
                            className={
                              m.from === 'user' ? styles.chatBubbleUser : styles.chatBubbleSupport
                            }
                          >
                            {m.text}
                          </Box>
                        ))}
                      </Box>
                      <Box className={styles.chatInputRow}>
                        <Input
                          type="text"
                          placeholder="Type your message..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                          className={styles.chatInput}
                        />
                        <Button
                          type="button"
                          variant="solid"
                          onClick={handleChatSend}
                          className={styles.chatSendBtn}
                          aria-label="Send message"
                        >
                          Send
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Main */}
        <Box className={styles.mainContent}>
          <Box as="header" className={styles.header}>
            <Box className={styles.headerContent}>
              <Text as="span" role="heading" aria-level={1} className={styles.pageTitle}>
                {currentPageLabel}
              </Text>

              <Box className={styles.headerActions}>
                <Box className={styles.headerToolbar}>
                  <IconButton
                    label="Help for this page"
                    size="sm"
                    className={styles.headerToolBtn}
                    onClick={() => {
                      setShowNotificationMenu(false);
                      setContextualHelpOpen(true);
                    }}
                    title="Help for this page"
                  >
                    <Info size={18} aria-hidden />
                  </IconButton>

                  <Box className={styles.notificationWrapper}>
                    <IconButton
                      label="Notifications"
                      size="sm"
                      className={styles.headerToolBtn}
                      onClick={() => setShowNotificationMenu((o) => !o)}
                    >
                      <Bell size={18} aria-hidden />
                      {unreadCount > 0 && (
                        <Badge variant="danger" className={styles.notificationBadge}>
                          {unreadCount}
                        </Badge>
                      )}
                    </IconButton>

                    {showNotificationMenu && (
                      <Box className={styles.notificationMenu}>
                        {notifications.length === 0 ? (
                          <Box className={styles.notificationEmpty}>No notifications</Box>
                        ) : (
                          notifications.map((n) => (
                            <Button
                              key={n.id}
                              type="button"
                              variant="ghost"
                              className={styles.notificationItem}
                              onClick={() => handleNotificationClick(n.id)}
                            >
                              <Box className={styles.notificationTitle}>
                                <Text as="span">{n.title}</Text>
                                {!n.read && <Box as="span" className={styles.notificationDot} />}
                              </Box>
                              <Box className={styles.notificationMessage}>{n.message}</Box>
                            </Button>
                          ))
                        )}
                      </Box>
                    )}
                  </Box>

                  <IconButton
                    label="Keyboard shortcuts"
                    size="sm"
                    className={styles.headerToolBtn}
                    onClick={() => setShortcutsHelpOpen(true)}
                    title={`Keyboard shortcuts (${DASHBOARD_HOTKEY.shortcutsHelp})`}
                  >
                    <Keyboard size={18} aria-hidden />
                  </IconButton>
                </Box>

                <Divider orientation="vertical" className={styles.headerDivider} aria-hidden />

                <Box className={styles.headerAccount}>
                  <ThemeToggle size="sm" variant="outline" className={styles.headerThemeBtn} />

                  <Box ref={userMenuRef} className={styles.userMenuAnchor}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.userBtn}
                      onClick={() => setUserMenuOpen((o) => !o)}
                      disabled={isLoading}
                    >
                      <Avatar name={user?.name || user?.email || 'User'} size="sm" />
                      <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        className={styles.userBtnLabel}
                      >
                        {user?.name || user?.email || 'User'}
                      </Text>
                    </Button>

                    {userMenuOpen && (
                      <Box className={styles.userMenu}>
                        <Box className={styles.userMenuHeader}>
                          <Box className={styles.userIdentity}>
                            <Avatar name={user?.name || user?.email || 'User'} size="md" />
                            <Box className={styles.userMeta}>
                              <Box className={styles.userMenuName}>{user?.name || 'User'}</Box>
                              <Box className={styles.userMenuEmail}>{user?.email}</Box>
                            </Box>
                          </Box>
                        </Box>

                        <UserMenuShopSection onClose={() => setUserMenuOpen(false)} />

                        <Button
                          type="button"
                          variant="ghost"
                          className={styles.profileMenuBtn}
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/dashboard/profile');
                          }}
                        >
                          <User size={16} aria-hidden />
                          View profile
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleLogout}
                          className={styles.logoutBtn}
                        >
                          <LogOut size={16} aria-hidden />
                          Logout
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            as="main"
            ref={mainContentRef}
            className={styles.content}
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
        </Box>
      </Box>

      <Modal open={editModalOpen} onClose={closeEditModal} className={styles.modal}>
        <Modal.Header title="Edit tagline & location" onClose={closeEditModal} />
        <Modal.Body>
          {editLoading ? (
            <CenteredLoader className={styles.modalLoading} />
          ) : (
            <Stack gap="md">
              {editError ? (
                <Alert variant="danger" className={styles.editError}>
                  {editError}
                </Alert>
              ) : null}
              <Stack className={styles.modalForm} gap="md">
                <FormField label="Tagline (optional)" id="edit-tagline">
                  <Input
                    id="edit-tagline"
                    type="text"
                    className={styles.modalInput}
                    value={editTagline}
                    onChange={(e) => setEditTagline(e.target.value)}
                    placeholder="e.g. Your Trusted Pharmacy"
                  />
                </FormField>
                <Label className={styles.modalLabel}>Location</Label>
                <Input
                  type="text"
                  className={styles.modalInput}
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
                  className={styles.modalInput}
                  placeholder="Secondary address"
                  value={editLocation.secondaryAddress ?? ''}
                  onChange={(e) =>
                    setEditLocation((prev) => ({
                      ...prev,
                      secondaryAddress: e.target.value,
                    }))
                  }
                />
                <Box className={styles.modalRow}>
                  <Input
                    type="text"
                    className={styles.modalInput}
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
                    className={styles.modalInput}
                    placeholder="State *"
                    value={editLocation.state}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                  />
                </Box>
                <Box className={styles.modalRow}>
                  <Input
                    type="text"
                    className={styles.modalInput}
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
                    className={styles.modalInput}
                    placeholder="Country *"
                    value={editLocation.country}
                    onChange={(e) =>
                      setEditLocation((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  />
                </Box>
              </Stack>
            </Stack>
          )}
        </Modal.Body>
        {!editLoading && (
          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              className={styles.modalCancelBtn}
              onClick={closeEditModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              className={styles.modalSaveBtn}
              onClick={handleSaveEdit}
              disabled={editSaving}
              loading={editSaving}
            >
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </Box>
  );
}
