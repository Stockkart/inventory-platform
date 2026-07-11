import styles from './AccountingChrome.module.css';

export const accountingChrome = {
  journalLineGrid: styles.journalLineGrid,
  journalHeaderLineGrid: styles.journalHeaderLineGrid,
  ledgerLayout: styles.ledgerLayout,
  ledgerLayoutCompact: styles.ledgerLayoutCompact,
  acctItem: styles.acctItem,
  acctItemActive: styles.acctItemActive,
  acctItemCode: styles.acctItemCode,
  acctItemLabel: styles.acctItemLabel,
  acctItemBalance: styles.acctItemBalance,
  acctItemBalanceMuted: styles.acctItemBalanceMuted,
  templateChip: styles.templateChip,
  templateChipActive: styles.templateChipActive,
  quickActionCard: styles.quickActionCard,
  balanceFooter: styles.balanceFooter,
  balanceBalanced: styles.balanceBalanced,
  balanceUnbalanced: styles.balanceUnbalanced,
  subTotalCell: styles.subTotalCell,
  grandTotalCell: styles.grandTotalCell,
  groupHeadingCell: styles.groupHeadingCell,
  numCol: styles.numCol,
  numColBold: styles.numColBold,
  navTabBar: styles.navTabBar,
  navTab: styles.navTab,
  navTabActive: styles.navTabActive,
  growMin14: styles.growMin14,
  inputNumRight: styles.inputNumRight,
  sidebarScrollCard: styles.sidebarScrollCard,
  metaLabelCell: styles.metaLabelCell,
  quickActionsGrid: styles.quickActionsGrid,
} as const;

/** @deprecated Prefer accountingChrome; class-name shims for domain migration. */
export const journalLineGridStyle = accountingChrome.journalLineGrid;
export const journalHeaderLineGridStyle = accountingChrome.journalHeaderLineGrid;
export const acctItemStyle = accountingChrome.acctItem;
export const acctItemActiveStyle = accountingChrome.acctItemActive;
export const acctItemCodeStyle = accountingChrome.acctItemCode;
export const acctItemLabelStyle = accountingChrome.acctItemLabel;
export const acctItemBalanceStyle = accountingChrome.acctItemBalance;
export const acctItemBalanceMutedStyle = accountingChrome.acctItemBalanceMuted;
export const quickActionCardStyle = accountingChrome.quickActionCard;
export const balanceFooterStyle = accountingChrome.balanceFooter;
export const balanceBalancedStyle = accountingChrome.balanceBalanced;
export const balanceUnbalancedStyle = accountingChrome.balanceUnbalanced;
export const subTotalCellStyle = accountingChrome.subTotalCell;
export const grandTotalCellStyle = accountingChrome.grandTotalCell;
export const groupHeadingCellStyle = accountingChrome.groupHeadingCell;
export const numColStyle = accountingChrome.numCol;
export const numColBoldStyle = accountingChrome.numColBold;

export function ledgerLayoutClassName(compact?: boolean): string {
  return compact ? accountingChrome.ledgerLayoutCompact : accountingChrome.ledgerLayout;
}

export function templateChipClassName(active: boolean): string {
  return active
    ? `${accountingChrome.templateChip} ${accountingChrome.templateChipActive}`
    : accountingChrome.templateChip;
}

export function navTabClassName(active: boolean): string {
  return active
    ? `${accountingChrome.navTab} ${accountingChrome.navTabActive}`
    : accountingChrome.navTab;
}
