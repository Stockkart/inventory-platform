import styles from './AccountingChrome.module.css';

export const accountingChrome = {
  journalLineGrid: styles.journalLineGrid,
  journalHeaderLineGrid: styles.journalHeaderLineGrid,
  journalColLabel: styles.journalColLabel,
  journalColLabelRight: styles.journalColLabelRight,
  journalMetaBar: styles.journalMetaBar,
  journalMetaNarration: styles.journalMetaNarration,
  journalBalanceBar: styles.journalBalanceBar,
  journalBalanceMeta: styles.journalBalanceMeta,
  journalBalanceFigures: styles.journalBalanceFigures,
  journalActions: styles.journalActions,
  ledgerLayout: styles.ledgerLayout,
  ledgerLayoutCompact: styles.ledgerLayoutCompact,
  acctItem: styles.acctItem,
  acctItemActive: styles.acctItemActive,
  acctItemMain: styles.acctItemMain,
  acctItemCode: styles.acctItemCode,
  acctItemLabel: styles.acctItemLabel,
  acctItemBalance: styles.acctItemBalance,
  acctItemBalanceMuted: styles.acctItemBalanceMuted,
  acctItemBalanceNeg: styles.acctItemBalanceNeg,
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
  overviewKpiGrid: styles.overviewKpiGrid,
  autoKpiGrid: styles.autoKpiGrid,
  kpiGrid4: styles.kpiGrid4,
  overviewKpiCard: styles.overviewKpiCard,
  overviewKpiLabel: styles.overviewKpiLabel,
  overviewKpiValue: styles.overviewKpiValue,
  overviewKpiValuePositive: styles.overviewKpiValuePositive,
  overviewKpiValueWarning: styles.overviewKpiValueWarning,
  overviewKpiValueMuted: styles.overviewKpiValueMuted,
  overviewSectionTitle: styles.overviewSectionTitle,
  entryLink: styles.entryLink,
  recentEntriesTable: styles.recentEntriesTable,
  recentEntriesAmount: styles.recentEntriesAmount,
  recentEntriesDate: styles.recentEntriesDate,
  recentEntriesStatus: styles.recentEntriesStatus,
  detailToolbar: styles.detailToolbar,
  detailHeader: styles.detailHeader,
  detailEntryNo: styles.detailEntryNo,
  detailNarration: styles.detailNarration,
  detailMetaGrid: styles.detailMetaGrid,
  detailMetaItem: styles.detailMetaItem,
  detailMetaLabel: styles.detailMetaLabel,
  detailMetaValue: styles.detailMetaValue,
  detailSectionTitle: styles.detailSectionTitle,
  detailLinesTable: styles.detailLinesTable,
  detailAmountCol: styles.detailAmountCol,
  detailAmountMuted: styles.detailAmountMuted,
  detailTotalsCell: styles.detailTotalsCell,
  detailParty: styles.detailParty,
  detailMemo: styles.detailMemo,
  reverseSummary: styles.reverseSummary,
  reverseSummaryRow: styles.reverseSummaryRow,
  reverseSummaryLabel: styles.reverseSummaryLabel,
  reverseSummaryValue: styles.reverseSummaryValue,
  reverseHint: styles.reverseHint,
  ledgerGroupTitle: styles.ledgerGroupTitle,
  ledgerAccountTitle: styles.ledgerAccountTitle,
  ledgerClosing: styles.ledgerClosing,
  ledgerClosingLabel: styles.ledgerClosingLabel,
  ledgerClosingValue: styles.ledgerClosingValue,
  ledgerClosingValueNeg: styles.ledgerClosingValueNeg,
  ledgerTable: styles.ledgerTable,
  ledgerDateCol: styles.ledgerDateCol,
  ledgerEntryCol: styles.ledgerEntryCol,
  ledgerSourceCol: styles.ledgerSourceCol,
  ledgerPartyCol: styles.ledgerPartyCol,
  ledgerNarrationCol: styles.ledgerNarrationCol,
  ledgerAmountCol: styles.ledgerAmountCol,
  ledgerBalanceCol: styles.ledgerBalanceCol,
  ledgerAmountMuted: styles.ledgerAmountMuted,
  partiesFilterBar: styles.partiesFilterBar,
  partiesFilterSearch: styles.partiesFilterSearch,
  partiesFilterDates: styles.partiesFilterDates,
  partiesFilterField: styles.partiesFilterField,
  partiesFilterLabel: styles.partiesFilterLabel,
  partiesTable: styles.partiesTable,
  partiesNameCol: styles.partiesNameCol,
  partiesNumCol: styles.partiesNumCol,
  partiesOwedCol: styles.partiesOwedCol,
  partiesActivityCol: styles.partiesActivityCol,
  partiesTxnsCol: styles.partiesTxnsCol,
  partiesKpiGrid: styles.partiesKpiGrid,
  pnlKpiGrid: styles.pnlKpiGrid,
  reportEmpty: styles.reportEmpty,
  tbAsOfInput: styles.tbAsOfInput,
  tbTable: styles.tbTable,
  misTable: styles.misTable,
  misTxnTypeCol: styles.misTxnTypeCol,
  misInvoiceCol: styles.misInvoiceCol,
  tbCodeCol: styles.tbCodeCol,
  tbAccountCol: styles.tbAccountCol,
  tbAccountMain: styles.tbAccountMain,
  tbAccountCode: styles.tbAccountCode,
  tbAccountLink: styles.tbAccountLink,
  tbNumCol: styles.tbNumCol,
  tbNumMuted: styles.tbNumMuted,
  tbGroupRow: styles.tbGroupRow,
  tbGroupRowFirst: styles.tbGroupRowFirst,
  tbSubtotalLabel: styles.tbSubtotalLabel,
  tbSubtotalRow: styles.tbSubtotalRow,
  tbTotalsLabel: styles.tbTotalsLabel,
  tbTotalsRow: styles.tbTotalsRow,
  tbStatus: styles.tbStatus,
  coaTable: styles.coaTable,
  coaNormalCol: styles.coaNormalCol,
  coaMetaCol: styles.coaMetaCol,
  coaActionCol: styles.coaActionCol,
  coaAccountCell: styles.coaAccountCell,
  coaInactiveName: styles.coaInactiveName,
  coaCreateGrid: styles.coaCreateGrid,
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
