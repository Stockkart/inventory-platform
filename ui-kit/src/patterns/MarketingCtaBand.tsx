import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box, Stack, Text } from '../layout';
import styles from './MarketingCtaBand.module.css';

export interface MarketingCtaBandProps {
  title: string;
  lead?: string;
  actions: ReactNode;
  className?: string;
}

export function MarketingCtaBand({ title, lead, actions, className }: MarketingCtaBandProps) {
  return (
    <Box as="section" className={cn(styles.band, className)}>
      <Stack gap="md" align="center" className={styles.inner}>
        <Text as="h2" className={styles.title}>
          {title}
        </Text>
        {lead ? (
          <Text as="p" className={styles.lead}>
            {lead}
          </Text>
        ) : null}
        {actions}
      </Stack>
    </Box>
  );
}
