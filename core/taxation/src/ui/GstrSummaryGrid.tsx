import { Box, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './gstr.module.css';

export interface GstrSummaryItem {
  label: string;
  value: string;
}

export interface GstrSummaryGridProps {
  items: GstrSummaryItem[];
}

export function GstrSummaryGrid({ items }: GstrSummaryGridProps) {
  if (items.length === 0) return null;

  return (
    <Box className={styles.summary}>
      <Inline gap="lg" flexWrap>
        {items.map((item) => (
          <Stack key={item.label} gap="xs" className={styles.summaryItem}>
            <Text variant="caption" color="secondary" className={styles.summaryLabel}>
              {item.label}
            </Text>
            <Text weight="semibold" className={styles.summaryValue}>
              {item.value}
            </Text>
          </Stack>
        ))}
      </Inline>
    </Box>
  );
}
