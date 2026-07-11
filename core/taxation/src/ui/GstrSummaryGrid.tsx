import { Box, Text, accountingChrome } from '@inventory-platform/ui-kit';

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
    <Box className={accountingChrome.autoKpiGrid}>
      {items.map((item) => (
        <Box key={item.label} className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            {item.label}
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {item.value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
