import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../forms/Button';
import { Box, Text } from '../layout';
import styles from './PlanCard.module.css';

export interface PlanCardProps {
  name: string;
  bestFor?: string | null;
  priceLabel: string;
  periodLabel?: string;
  oneTimeLabel?: string | null;
  features: string[];
  showTrialBadge?: boolean;
  /** Trial length shown on the badge. Callers pass the plan's value from the API. */
  trialDays?: number;
  highlighted?: boolean;
  showPopularBadge?: boolean;
  ctaLabel?: string;
  onSelect?: () => void;
  className?: string;
  footer?: ReactNode;
}

export function PlanCard({
  name,
  bestFor,
  priceLabel,
  periodLabel = '/year',
  oneTimeLabel,
  features,
  showTrialBadge = true,
  trialDays = 3,
  highlighted = false,
  showPopularBadge = false,
  ctaLabel = 'Get Started',
  onSelect,
  className,
  footer,
}: PlanCardProps) {
  return (
    <Box as="article" className={cn(styles.card, highlighted && styles.highlighted, className)}>
      {showPopularBadge ? (
        <Box className={styles.popular}>
          <span className={styles.popularBadge}>Most Popular</span>
        </Box>
      ) : null}

      <Box className={styles.inner}>
        {showTrialBadge ? <span className={styles.trial}>Free {trialDays}-day trial</span> : null}

        <Text as="h3" className={styles.name}>
          {name}
        </Text>

        {bestFor ? (
          <Text as="p" className={styles.bestFor}>
            {bestFor}
          </Text>
        ) : null}

        <Box className={styles.priceRow}>
          <Text as="p" className={styles.price}>
            {priceLabel}
          </Text>
          <Text as="span" className={styles.period}>
            {periodLabel}
          </Text>
        </Box>

        {oneTimeLabel ? (
          <Text as="p" className={styles.oneTime}>
            {oneTimeLabel}
          </Text>
        ) : null}

        <ul className={styles.features}>
          {features.map((feature) => (
            <li key={feature} className={styles.feature}>
              <span className={styles.check} aria-hidden>
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {footer ??
          (onSelect ? (
            <Box className={styles.cta}>
              <Button type="button" variant="brand" fullWidth onClick={onSelect}>
                {ctaLabel}
              </Button>
            </Box>
          ) : null)}
      </Box>
    </Box>
  );
}
