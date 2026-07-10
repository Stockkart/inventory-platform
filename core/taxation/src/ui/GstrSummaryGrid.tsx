import { Box, Inline, Stack, Text } from '@inventory-platform/ui-kit';

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
          <Stack key={item.label} gap="xs" style={{ minWidth: '120px' }}>
            <Text variant="caption" color="secondary" weight="semibold">
              {item.label}
            </Text>
            <Text weight="semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </Text>
          </Stack>
        ))}
      </Inline>
    </Box>
  );
}
