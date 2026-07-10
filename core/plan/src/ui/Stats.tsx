import { Box, Stack, Text, useMatchMedia } from '@inventory-platform/ui-kit';

export function Stats() {
  const isSmall = useMatchMedia('(max-width: 480px)');
  const isMobile = useMatchMedia('(max-width: 768px)');

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '---', label: 'Active Users' },
    { value: '---', label: 'Products Tracked' },
    { value: '24/7', label: 'Support' },
  ];

  const gridColumns = isSmall ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

  return (
    <Box as="section" padding="xl" bg="canvas" width="full">
      <Box
        display="grid"
        maxWidth="xl"
        mx="auto"
        style={{
          gridTemplateColumns: gridColumns,
          gap: isMobile ? '2rem 1rem' : '2rem',
        }}
      >
        {stats.map((stat, index) => (
          <Stack key={index} gap="sm" align="center">
            <Text
              weight="bold"
              style={{
                fontSize: isMobile ? '2rem' : '3rem',
                color: '#3b82f6',
              }}
            >
              {stat.value}
            </Text>
            <Text color="secondary">{stat.label}</Text>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
