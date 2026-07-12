import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import styles from './AppShell.module.css';

export type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  header?: ReactNode;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  mobileMenuButton?: ReactNode;
  className?: string;
};

/**
 * Dashboard chrome: collapsible fixed sidebar + fixed main header + mobile drawer.
 * Owns the shell layout CSS so domains/shell don't need local modules.
 */
export function AppShell({
  children,
  sidebar,
  header,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  mobileMenuButton,
  className,
}: AppShellProps) {
  return (
    <Box
      className={cn(styles.shell, collapsed && styles.shellCollapsed, className)}
      bg="canvas"
      height="full"
    >
      {mobileMenuButton ? (
        <Box className={styles.mobileMenuFloating}>{mobileMenuButton}</Box>
      ) : null}
      {mobileOpen ? (
        <Box className={styles.sidebarBackdropVisible} onClick={onMobileClose} aria-hidden />
      ) : null}
      <Box className={styles.shellBody}>
        <Box className={styles.sidebarColumn}>
          <Box
            className={cn(styles.sidebar, mobileOpen ? styles.sidebarOpen : styles.sidebarClosed)}
            bg="surface"
          >
            {sidebar}
          </Box>
        </Box>
        <Box display="flex" flexDirection="column" width="full" className={styles.mainColumn}>
          {header ? <Box className={styles.shellHeader}>{header}</Box> : null}
          <Box className={styles.mainContent} padding="md">
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Styles for sidebar nav links (hover / active). Apply to react-router Link via className. */
export function navItemClassName(active?: boolean, className?: string) {
  return cn(styles.navLink, active && styles.navLinkActive, className);
}

export function navItemCollapsedClassName(active?: boolean, className?: string) {
  return cn(styles.navLink, styles.navLinkCollapsed, active && styles.navLinkActive, className);
}

/** Collapsible sidebar section header (group label). */
export function navGroupClassName(className?: string) {
  return cn(styles.navGroup, className);
}

export const navGroupIconClassName = styles.navGroupIcon;
export const navGroupLabelClassName = styles.navGroupLabel;
export const navGroupBlockClassName = styles.navGroupBlock;
export const navSubListClassName = styles.navSubList;

export function navGroupChevronClassName(open?: boolean) {
  return cn(styles.navGroupChevron, open && styles.navGroupChevronOpen);
}

export function navItemIconClassName(active?: boolean, collapsed?: boolean) {
  return cn(
    styles.navItemIcon,
    active && styles.navItemIconActive,
    collapsed && styles.navItemIconCollapsed,
  );
}

export const navItemLabelClassName = styles.navItemLabel;

export const shellChrome = {
  mobileMenuFab: styles.mobileMenuFab,
  sidebarHeader: styles.sidebarHeader,
  sidebarHeaderCollapsed: styles.sidebarHeaderCollapsed,
  sidebarBrandLink: styles.sidebarBrandLink,
  sidebarBrandLinkCollapsed: styles.sidebarBrandLinkCollapsed,
  sidebarLogo: styles.sidebarLogo,
  sidebarLogoCollapsed: styles.sidebarLogoCollapsed,
  sidebarToggle: styles.sidebarToggle,
  sidebarToggleCollapsed: styles.sidebarToggleCollapsed,
  sidebarNav: styles.sidebarNav,
  sidebarFooter: styles.sidebarFooter,
  supportToggle: styles.supportToggle,
  supportToggleCollapsed: styles.supportToggleCollapsed,
  supportToggleLabel: styles.supportToggleLabel,
  supportIcon: styles.supportIcon,
  supportPanel: styles.supportPanel,
  chatThread: styles.chatThread,
  chatBubble: styles.chatBubble,
  chatBubbleUser: styles.chatBubbleUser,
  chatBubbleSupport: styles.chatBubbleSupport,
  chatInput: styles.chatInput,
  headerBar: styles.headerBar,
  headerBarCompact: styles.headerBarCompact,
  headerTitle: styles.headerTitle,
  headerActions: styles.headerActions,
  headerIconButton: styles.headerIconButton,
  headerDivider: styles.headerDivider,
  headerThemeToggle: styles.headerThemeToggle,
  headerUserTrigger: styles.headerUserTrigger,
  notificationBadge: styles.notificationBadge,
  notificationEmpty: styles.notificationEmpty,
  notificationEmptyTitle: styles.notificationEmptyTitle,
  notificationEmptyHint: styles.notificationEmptyHint,
  notificationPanelHeader: styles.notificationPanelHeader,
  notificationPanelTitle: styles.notificationPanelTitle,
  notificationPanelMeta: styles.notificationPanelMeta,
  notificationUnreadCount: styles.notificationUnreadCount,
  notificationClearBtn: styles.notificationClearBtn,
  notificationPanelList: styles.notificationPanelList,
  notificationRow: styles.notificationRow,
  notificationRowUnread: styles.notificationRowUnread,
  notificationTypeIcon: styles.notificationTypeIcon,
  notificationTypeIconLow: styles.notificationTypeIconLow,
  notificationTypeIconReminder: styles.notificationTypeIconReminder,
  notificationRowBody: styles.notificationRowBody,
  notificationRowTop: styles.notificationRowTop,
  notificationRowTitle: styles.notificationRowTitle,
  notificationRowMessage: styles.notificationRowMessage,
  unreadDot: styles.unreadDot,
  preLine: styles.preLine,
  breakAll: styles.breakAll,
  menuSection: styles.menuSection,
  menuUserName: styles.menuUserName,
  menuUserEmail: styles.menuUserEmail,
  menuItem: styles.menuItem,
  menuItemBordered: styles.menuItemBordered,
  menuItemDanger: styles.menuItemDanger,
  shopSection: styles.shopSection,
  shopSectionLabel: styles.shopSectionLabel,
  shopCurrentCard: styles.shopCurrentCard,
  shopCurrentIcon: styles.shopCurrentIcon,
  shopCurrentName: styles.shopCurrentName,
  shopSwitchList: styles.shopSwitchList,
  shopSwitchBtn: styles.shopSwitchBtn,
  shopSwitchBtnMain: styles.shopSwitchBtnMain,
  shopSwitchBtnName: styles.shopSwitchBtnName,
  shopSwitchBtnRole: styles.shopSwitchBtnRole,
  shopSwitchBtnMeta: styles.shopSwitchBtnMeta,
  shopActions: styles.shopActions,
  mainSurface: styles.mainSurface,
  videoFrame: styles.videoFrame,
  videoIframe: styles.videoIframe,
  metricIcon: styles.metricIcon,
  autoGridSm: styles.autoGridSm,
  autoGridMd: styles.autoGridMd,
  nowrap: styles.nowrap,
  kbdHint: styles.kbdHint,
  commandPaletteBody: styles.commandPaletteBody,
  commandPaletteList: styles.commandPaletteList,
  commandPaletteEmpty: styles.commandPaletteEmpty,
  commandRowIcon: styles.commandRowIcon,
  shopSwitcherTrigger: styles.shopSwitcherTrigger,
  toastStack: styles.toastStack,
  cmdSearchRow: styles.cmdSearchRow,
  cmdSearchIcon: styles.cmdSearchIcon,
  cmdInput: styles.cmdInput,
  cmdEscHint: styles.cmdEscHint,
  cmdFooter: styles.cmdFooter,
  cmdItem: styles.cmdItem,
  cmdItemActive: styles.cmdItemActive,
  cmdItemIdx: styles.cmdItemIdx,
  cmdItemIcon: styles.cmdItemIcon,
  cmdFooterHint: styles.cmdFooterHint,
  kbdAssignSelect: styles.kbdAssignSelect,
  kbdHeaderCellAction: styles.kbdHeaderCellAction,
  kbdActionCell: styles.kbdActionCell,
  shopChevron: styles.shopChevron,
  shopChevronOpen: styles.shopChevronOpen,
  shopDropdown: styles.shopDropdown,
  shopDropdownLabel: styles.shopDropdownLabel,
  shopDropdownItem: styles.shopDropdownItem,
  shopDropdownItemActive: styles.shopDropdownItemActive,
  shopDropdownAdd: styles.shopDropdownAdd,
} as const;

export type PopoverPanelVariant = 'default' | 'notification' | 'userMenu';

export function PopoverPanel({
  children,
  className,
  style,
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: PopoverPanelVariant;
}) {
  return (
    <Box
      className={cn(
        styles.popover,
        variant === 'notification' && styles.popoverNotification,
        variant === 'userMenu' && styles.popoverUserMenu,
        className,
      )}
      style={style}
    >
      {children}
    </Box>
  );
}

export function NotificationDot({ className }: { className?: string }) {
  return <Box className={cn(styles.notificationDot, className)} aria-hidden />;
}
