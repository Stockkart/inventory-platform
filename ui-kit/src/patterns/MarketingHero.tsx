import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box, Inline, Stack, Text } from '../layout';
import styles from './MarketingHero.module.css';

export interface MarketingHeroProps {
  backgrounds: string[];
  activeIndex: number;
  /** Optional brand line above the headline. Omit to keep the hero copy lean. */
  brand?: string;
  headline: string;
  support: string;
  actions: ReactNode;
  className?: string;
}

export function MarketingHero({
  backgrounds,
  activeIndex,
  brand,
  headline,
  support,
  actions,
  className,
}: MarketingHeroProps) {
  return (
    <Box as="section" className={cn(styles.hero, className)}>
      <Box className={styles.media} aria-hidden>
        {backgrounds.map((src, index) => (
          <Box
            key={src}
            className={cn(styles.slide, index === activeIndex && styles.slideActive)}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <Box className={styles.overlay} />
      </Box>

      <Stack gap="lg" align="center" className={styles.content}>
        {brand ? (
          <Text as="p" className={styles.brand}>
            {brand}
          </Text>
        ) : null}
        <Text as="h1" className={cn(styles.headline, !brand && styles.headlineSolo)}>
          {headline}
        </Text>
        <Text as="p" className={styles.support}>
          {support}
        </Text>
        <Inline gap="md" justify="center" flexWrap className={styles.actions}>
          {actions}
        </Inline>
      </Stack>
    </Box>
  );
}
