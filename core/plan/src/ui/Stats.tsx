import { Box, Grid, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './Stats.module.css';

export function Stats() {
  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '---', label: 'Active Users' },
    { value: '---', label: 'Products Tracked' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <Box as="section" className={styles.stats}>
      <Grid className={styles.container}>
        {stats.map((stat, index) => (
          <Stack key={index} gap="sm" className={styles.statItem}>
            <Text className={styles.statValue}>{stat.value}</Text>
            <Text className={styles.statLabel}>{stat.label}</Text>
          </Stack>
        ))}
      </Grid>
    </Box>
  );
}
