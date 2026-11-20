import { Fragment, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconButton } from '../forms/IconButton';
import styles from './SaleBanner.module.css';

/** Kept on the strip as `data-sale-theme`; every theme currently uses the same navy strip. */
export type SaleBannerTheme = 'default' | 'monsoon' | 'summer' | 'diwali' | 'newYear';

export interface SaleBannerProps {
  theme?: SaleBannerTheme;
  /** Short state line, e.g. "Sale starts soon". */
  eyebrow?: ReactNode;
  headline: ReactNode;
  subtext?: ReactNode;
  /** Countdown or date text, e.g. "Ends in 2d 04h". */
  countdown?: ReactNode;
  /** Brightens the countdown. */
  urgent?: boolean;
  /** Last item of each run, e.g. "See plans". Shown only with `onActivate`. */
  actionLabel?: string;
  /** Makes the whole strip a button. */
  onActivate?: () => void;
  /** Omit to hide the close button. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/** Copies of the message per half of the track, so one half is wider than a wide screen. */
const RUNS = 4;
const SEPARATORS = ['✦', '%'];

/**
 * Thin full-width announcement strip whose message scrolls right to left like a ticker; it stands
 * still under reduced motion. While it is on the page it sets `--sale-strip-height` on the root,
 * so content under a fixed header can make room for it.
 */
export function SaleBanner({
  theme = 'default',
  eyebrow,
  headline,
  subtext,
  countdown,
  urgent = false,
  actionLabel,
  onActivate,
  onDismiss,
  dismissLabel = 'Dismiss announcement',
  className,
}: SaleBannerProps) {
  const items: { key: string; node: ReactNode; strong?: boolean }[] = [];
  if (eyebrow) items.push({ key: 'eyebrow', node: eyebrow });
  items.push({ key: 'headline', node: headline, strong: true });
  if (subtext) items.push({ key: 'subtext', node: subtext });
  if (countdown) items.push({ key: 'countdown', node: countdown, strong: urgent });
  if (actionLabel && onActivate) {
    items.push({ key: 'action', node: `${actionLabel} →`, strong: true });
  }

  const run = (copy: number) =>
    items.map((item, i) => (
      <Fragment key={`${copy}-${item.key}`}>
        <span className={cn(styles.item, item.strong && styles.strong)}>{item.node}</span>
        <span className={styles.separator}>{SEPARATORS[(copy * items.length + i) % 2]}</span>
      </Fragment>
    ));

  const half = (first: number) => (
    <span className={styles.half}>
      {Array.from({ length: RUNS }, (_, copy) => run(first + copy))}
    </span>
  );

  // Screen readers get the message once; the moving copies are hidden from them.
  const content = (
    <>
      <span className={styles.srOnly}>
        {items.map((item) => (
          <span key={item.key}>{item.node}. </span>
        ))}
      </span>
      <span className={styles.viewport} aria-hidden>
        <span className={styles.track}>
          {half(0)}
          {half(RUNS)}
        </span>
      </span>
    </>
  );

  return (
    <section
      aria-label="Sale announcement"
      data-sale-strip=""
      data-sale-theme={theme}
      className={cn(styles.strip, className)}
    >
      {onActivate ? (
        <button type="button" className={styles.body} onClick={onActivate}>
          {content}
        </button>
      ) : (
        <span className={styles.body}>{content}</span>
      )}
      {onDismiss ? (
        <IconButton size="sm" label={dismissLabel} className={styles.dismiss} onClick={onDismiss}>
          <X size={14} aria-hidden />
        </IconButton>
      ) : null}
    </section>
  );
}
