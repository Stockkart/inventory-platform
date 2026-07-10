import styles from './ChartFrame.module.css';

/** Shared chart / analytics layout classes (no domain CSS). */
export const chartChrome = {
  frame: styles.frame,
  frameTall: styles.frameTall,
  plot: styles.plot,
  card: styles.card,
  emptyHint: styles.emptyHint,
  chartToolbar: styles.chartToolbar,
  collapsibleCard: styles.collapsibleCard,
  collapsibleTrigger: styles.collapsibleTrigger,
  chevron: styles.chevron,
  chevronOpen: styles.chevronOpen,
  autoGridFill: styles.autoGridFill,
  autoGridFillWide: styles.autoGridFillWide,
} as const;
