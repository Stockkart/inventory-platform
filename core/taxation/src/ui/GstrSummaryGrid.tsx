import { Box, Inline, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';

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
    <Box bg="muted" rounded="md" padding="md">
      <Inline gap="lg" flexWrap>
        {items.map((item) => (
          <Stack key={item.label} gap="xs" className={surfaceChrome.minW120}>
            <Text variant="caption" color="secondary" weight="semibold">
              {item.label}
            </Text>
            <Text weight="semibold" className={surfaceChrome.tabularNums}>
              {item.value}
            </Text>
          </Stack>
        ))}
      </Inline>
    </Box>
  );
}
