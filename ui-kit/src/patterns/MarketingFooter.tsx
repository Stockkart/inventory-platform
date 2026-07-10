import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box, Stack, Text } from '../layout';
import styles from './MarketingFooter.module.css';

export interface MarketingFooterColumn {
  title: string;
  links: ReactNode;
}

export interface MarketingFooterProps {
  brand: ReactNode;
  tagline: string;
  columns: MarketingFooterColumn[];
  copyright: string;
  /** Optional right-side meta links in the bottom bar */
  meta?: ReactNode;
  className?: string;
}

export function MarketingFooter({
  brand,
  tagline,
  columns,
  copyright,
  meta,
  className,
}: MarketingFooterProps) {
  return (
    <Box as="footer" className={cn(styles.footer, className)}>
      <Stack gap="none" className={styles.inner}>
        <Box className={styles.grid}>
          <Box className={styles.brandCol}>
            {brand}
            <Text as="p" className={styles.tagline}>
              {tagline}
            </Text>
          </Box>
          {columns.map((column) => (
            <Stack key={column.title} gap="none">
              <Text as="h3" className={styles.colTitle}>
                {column.title}
              </Text>
              <Box className={styles.links}>{column.links}</Box>
            </Stack>
          ))}
        </Box>

        <Box className={styles.bottom}>
          <Text as="p" className={styles.copyright}>
            {copyright}
          </Text>
          {meta ? <Box className={styles.meta}>{meta}</Box> : null}
        </Box>
      </Stack>
    </Box>
  );
}
