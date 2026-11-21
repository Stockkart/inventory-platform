import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../forms/Button';
import { Badge } from '../feedback/Badge';
import { Box, Text, VisuallyHidden } from '../layout';
import styles from './PlanCard.module.css';

/** A feature line; `comingSoon` adds a "Coming soon" tag for something sold but not live yet. */
export interface PlanCardFeature {
  label: string;
  comingSoon?: boolean;
}

export interface PlanCardProps {
  name: string;
  bestFor?: string | null;
  priceLabel: string;
  /** Struck-through anchor shown before the price. */
  listPriceLabel?: string | null;
  periodLabel?: string;
  oneTimeLabel?: string | null;
  features: (string | PlanCardFeature)[];
  showTrialBadge?: boolean;
  /** Trial badge text, e.g. "Free 3-day trial"; the caller formats the API's trial length. */
  trialLabel?: string;
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
  listPriceLabel,
  periodLabel = '/year',
  oneTimeLabel,
  features,
  showTrialBadge = true,
  trialLabel = 'Free trial',
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
          <span className={styles.popularBadge}>Most popular</span>
        </Box>
      ) : null}

      <Box className={styles.inner}>
        {showTrialBadge ? <span className={styles.trial}>{trialLabel}</span> : null}

        <Text as="h3" className={styles.name}>
          {name}
        </Text>

        {bestFor ? (
          <Text as="p" className={styles.bestFor}>
            {bestFor}
          </Text>
        ) : null}

        <Box className={styles.priceRow}>
          {listPriceLabel ? (
            <Text as="s" className={styles.listPrice}>
              <VisuallyHidden>Was </VisuallyHidden>
              {listPriceLabel}
            </Text>
          ) : null}
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
          {features.map((item) => {
            const feature = typeof item === 'string' ? { label: item } : item;
            return (
              <li key={feature.label} className={styles.feature}>
                <span className={styles.check} aria-hidden>
                  ✓
                </span>
                <span>
                  {feature.label}
                  {feature.comingSoon ? (
                    <Badge variant="warning" className={styles.comingSoon}>
                      Coming soon
                    </Badge>
                  ) : null}
                </span>
              </li>
            );
          })}
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
