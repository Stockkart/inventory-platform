import { Box, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './Stats.module.css';

export function Stats() {
  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '---', label: 'Active Users' },
    { value: '---', label: 'Products Tracked' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <Box as="section" padding="xl" bg="canvas" width="full">
      <Box className={styles.statsGrid} maxWidth="xl" mx="auto">
        {stats.map((stat, index) => (
          <Stack key={index} gap="sm" align="center">
            <Text className={styles.statValue}>{stat.value}</Text>
            <Text color="secondary">{stat.label}</Text>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
