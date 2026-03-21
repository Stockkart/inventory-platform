import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/store';
import type { DashboardLayoutProps } from '@inventory-platform/types';
import styles from './DashboardLayout.module.css';
import { ThemeToggle } from './ThemeToggle';
import { useNotifications } from '@inventory-platform/store';
import { ToastProvider } from './ToastProvider';
import {
  Menu,
  Headphones,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type MenuItem = { path: string; label: string; icon: string };

type MenuGroup = {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/dashboard/shops', label: 'Shops', icon: '🏪' },
      { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
    ],
  },
  {
    id: 'products',
    label: 'Products & Sales',
    icon: '📦',
    items: [
      {
        path: '/dashboard/product-registration',
        label: 'Product Registration',
        icon: '📦',
      },
      // Import disabled for now
      // { path: '/dashboard/import', label: 'Import', icon: '📥' },
      {
        path: '/dashboard/product-search',
        label: 'Product Search',
        icon: '🔍',
      },
      { path: '/dashboard/pricing', label: 'Pricing', icon: '💰' },
      { path: '/dashboard/scan-sell', label: 'Scan and Sell', icon: '📱' },
      { path: '/dashboard/refund', label: 'Refund', icon: '↩️' },
    ],
  },
  {
    id: 'reminders-alerts',
    label: 'Reminders & Alerts',
    icon: '🔔',
    items: [
      { path: '/dashboard/reminders', label: 'Reminder', icon: '📅' },
      {
        path: '/dashboard/inventory-alert',
        label: 'Inventory Low Alert',
        icon: '🔔',
      },
    ],
  },
  {
    id: 'analytics-history',
    label: 'Reports & Analytics',
    icon: '📈',
    items: [
      {
        path: '/dashboard/analytics',
        label: 'Analytics Dashboard',
        icon: '📈',
      },
      { path: '/dashboard/taxes', label: 'Taxes', icon: '📋' },
      { path: '/dashboard/history', label: 'History', icon: '📜' },
    ],
  },
  {
    id: 'credit-ledger',
    label: 'Credit & Ledger',
    icon: '📒',
    items: [
      { path: '/dashboard/credit-ledger', label: 'Credit Ledger', icon: '📒' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: '📇',
    items: [
      { path: '/dashboard/customers', label: 'Customer', icon: '👥' },
      { path: '/dashboard/vendors', label: 'Vendor', icon: '🚚' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: '📣',
    items: [
      {
        path: '/dashboard/whatsapp-marketing',
        label: 'WhatsApp Marketing',
        icon: '💬',
      },
    ],
  },
  {
    id: 'team',
    label: 'Team & Collaboration',
    icon: '👥',
    items: [
      { path: '/dashboard/invitations', label: 'Invitations', icon: '✉️' },
      {
        path: '/dashboard/my-invitations',
        label: 'My Invitations',
        icon: '📬',
      },
      { path: '/dashboard/join-requests', label: 'Join Requests', icon: '🤝' },
      { path: '/dashboard/shop-users', label: 'Shop Users', icon: '👥' },
    ],
  },
  {
    id: 'payment-plan',
    label: 'Payment & Plan',
    icon: '💳',
    items: [
      { path: '/dashboard/plan-payment', label: 'Payment', icon: '💳' },
      { path: '/dashboard/plan-status', label: 'My Plan', icon: '📋' },
    ],
  },
];

const CASHIER_HIDDEN_PATHS = [
  '/dashboard/shop-users',
  '/dashboard/invitations',
  '/dashboard/join-requests',
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, shop, logout, isLoading } = useAuthStore();

  //const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 768 ? false : true
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['overview', 'products'])
  );
  const [supportOpen, setSupportOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { text: string; from: 'user' | 'support' }[]
  >([]);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Reminder notifications (ALL logic lives in hook)
  const { notifications, unreadCount, markAsRead } = useNotifications(
    user?.shopId ?? undefined
  );

  const [shopName, setShopName] = useState<string | null>(null);

  useEffect(() => {
    if (shop?.name) {
      setShopName(shop.name);
      localStorage.setItem('shopName', shop.name);
    } else {
      const saved = localStorage.getItem('shopName');
      if (saved) {
        setShopName(saved);
      }
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
    [notifications, markAsRead, navigate]
  );

  const currentPath = location.pathname;

  const filteredMenuGroups = useMemo(() => {
    const isCashier = user?.role === 'CASHIER';
    return MENU_GROUPS.map((group) => ({
      ...group,
      items: isCashier
        ? group.items.filter(
            (item) => !CASHIER_HIDDEN_PATHS.includes(item.path)
          )
        : group.items,
    })).filter((group) => group.items.length > 0);
  }, [user?.role]);

  const allMenuItems = useMemo(
    () => filteredMenuGroups.flatMap((g) => g.items),
    [filteredMenuGroups]
  );

  const currentPageLabel =
    allMenuItems.find((i) => i.path === currentPath)?.label ?? 'Dashboard';

  const isPathInGroup = useCallback(
    (groupId: string, path: string) => {
      const group = filteredMenuGroups.find((g) => g.id === groupId);
      return group?.items.some((i) => i.path === path) ?? false;
    },
    [filteredMenuGroups]
  );

  useEffect(() => {
    const groupWithPath = filteredMenuGroups.find((g) =>
      g.items.some((i) => i.path === currentPath)
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

  const handleChatSend = () => {
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { text: chatMessage.trim(), from: 'user' },
    ]);
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
    <div className={styles.dashboard}>
      <ToastProvider />
      {!sidebarOpen && window.innerWidth <= 768 && (
        <button
          className={styles.mobileMenuFloating}
          onClick={() => setSidebarOpen(true)}
          type="button"
        >
          <Menu size={18} />
        </button>
      )}
      {sidebarOpen && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed
        }`}
      >
        <div className={styles.sidebarHeader}>
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

          <button
            className={styles.toggleBtn}
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {sidebarOpen ? (
            filteredMenuGroups.map((group) => {
              const isExpanded =
                expandedGroups.has(group.id) ||
                isPathInGroup(group.id, currentPath);
              return (
                <div key={group.id} className={styles.navGroup}>
                  <button
                    type="button"
                    className={styles.navGroupHeader}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className={styles.navGroupIcon}>{group.icon}</span>
                    <span className={styles.navGroupLabel}>{group.label}</span>
                    <span
                      className={`${styles.navGroupChevron} ${
                        isExpanded ? styles.navGroupChevronOpen : ''
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {isExpanded && (
                    <div className={styles.navGroupItems}>
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`${styles.navItem} ${
                            currentPath === item.path ? styles.active : ''
                          }`}
                        >
                          <span className={styles.navIcon}>{item.icon}</span>
                          <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.navCollapsed}>
              {allMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${styles.navItemCollapsed} ${
                    currentPath === item.path ? styles.active : ''
                  }`}
                  title={item.label}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Support section at bottom */}
        <div className={styles.sidebarSupport}>
          <button
            type="button"
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
              <span className={styles.supportLabel}>Support</span>
            )}
            {sidebarOpen &&
              (supportOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              ))}
          </button>

          {supportOpen && (
            <div className={styles.supportPanel}>
              {/* Phone */}
              <div className={styles.supportSection}>
                <Phone size={14} className={styles.supportSectionIcon} />
                <span className={styles.supportSectionTitle}>Call us</span>
                <a href="tel:+919828606899" className={styles.supportLink}>
                  +91-9828606899
                </a>
                <a href="tel:+918800107393" className={styles.supportLink}>
                  +91-8800107393
                </a>
              </div>

              {/* Email */}
              <div className={styles.supportSection}>
                <Mail size={14} className={styles.supportSectionIcon} />
                <span className={styles.supportSectionTitle}>Email</span>
                <a
                  href="mailto:stockkartofficial@gmail.com"
                  className={styles.supportLink}
                >
                  stockkartofficial@gmail.com
                </a>
              </div>

              {/* Online chat placeholder */}
              <div className={styles.supportSection}>
                <MessageCircle
                  size={14}
                  className={styles.supportSectionIcon}
                />
                <span className={styles.supportSectionTitle}>
                  Instant online support
                </span>
                <div className={styles.chatPlaceholder}>
                  <div className={styles.chatMessages}>
                    {chatMessages.length === 0 && (
                      <p className={styles.chatEmpty}>
                        Start a conversation. We&apos;ll integrate with backend
                        soon.
                      </p>
                    )}
                    {chatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={
                          m.from === 'user'
                            ? styles.chatBubbleUser
                            : styles.chatBubbleSupport
                        }
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>
                  <div className={styles.chatInputRow}>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                      className={styles.chatInput}
                    />
                    <button
                      type="button"
                      onClick={handleChatSend}
                      className={styles.chatSendBtn}
                      aria-label="Send message"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>{currentPageLabel}</h1>

            <div className={styles.headerActions}>
              {/* Notifications */}
              <div className={styles.notificationWrapper}>
                <button
                  className={styles.notificationBtn}
                  onClick={() => setShowNotificationMenu((o) => !o)}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationMenu && (
                  <div className={styles.notificationMenu}>
                    {notifications.length === 0 ? (
                      <div className={styles.notificationEmpty}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          className={styles.notificationItem}
                          onClick={() => handleNotificationClick(n.id)}
                        >
                          <div className={styles.notificationTitle}>
                            <span>{n.title}</span>
                            {!n.read && (
                              <span className={styles.notificationDot} />
                            )}
                          </div>
                          <div className={styles.notificationMessage}>
                            {n.message}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <ThemeToggle />

              {/* User Menu */}
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  className={styles.userBtn}
                  onClick={() => setUserMenuOpen((o) => !o)}
                  disabled={isLoading}
                >
                  👤 {user?.name || user?.email || 'User'}
                </button>

                {userMenuOpen && (
                  <div className={styles.userMenu}>
                    <div className={styles.userMenuHeader}>
                      <div className={styles.userIdentity}>
                        <div className={styles.avatar}>👤</div>

                        <div className={styles.userMeta}>
                          <div className={styles.userMenuName}>
                            {user?.name || 'User'}
                          </div>
                          <div className={styles.userMenuEmail}>
                            {user?.email}
                          </div>
                        </div>
                      </div>

                      <div className={styles.userMenuInfo}>
                        <span className={styles.roleBadge}>{shopName}</span>
                        <button
                          type="button"
                          className={styles.editMetaBtn}
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/dashboard/profile');
                          }}
                        >
                          View profile
                        </button>
                      </div>
                    </div>

                    <button onClick={handleLogout} className={styles.logoutBtn}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
