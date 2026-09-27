import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconButton } from '../forms/IconButton';
import styles from './SaleBanner.module.css';

export type SaleBannerTheme = 'default' | 'monsoon' | 'summer' | 'diwali' | 'newYear';

export interface SaleBannerProps {
  theme?: SaleBannerTheme;
  /** Short state line, e.g. "Sale starts soon". */
  eyebrow?: ReactNode;
  headline: ReactNode;
  subtext?: ReactNode;
  /** Countdown or date text; shown as a pill. */
  countdown?: ReactNode;
  /** Pulses the countdown pill (not under reduced motion). */
  urgent?: boolean;
  action?: ReactNode;
  /** Omit to hide the close button. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export function SaleBanner({
  theme = 'default',
  eyebrow,
  headline,
  subtext,
  countdown,
  urgent = false,
  action,
  onDismiss,
  dismissLabel = 'Dismiss announcement',
  className,
}: SaleBannerProps) {
  return (
    <section aria-label="Sale announcement" className={cn(styles.banner, styles[theme], className)}>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <p className={styles.headline}>{headline}</p>
        {subtext ? <p className={styles.subtext}>{subtext}</p> : null}
      </div>
      {countdown || action ? (
        <div className={styles.side}>
          {countdown ? (
            <span className={cn(styles.countdown, urgent && styles.urgent)}>{countdown}</span>
          ) : null}
          {action}
        </div>
      ) : null}
      {onDismiss ? (
        <IconButton size="sm" label={dismissLabel} className={styles.dismiss} onClick={onDismiss}>
          <X size={16} aria-hidden />
        </IconButton>
      ) : null}
    </section>
  );
}
