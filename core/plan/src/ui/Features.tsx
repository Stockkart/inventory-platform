import type { Feature } from '@inventory-platform/shell/types';
import { Box, Grid, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './Features.module.css';

export function Features() {
  const mainFeatures: Feature[] = [
    {
      icon: '📦',
      title: 'Product Registration',
      description:
        'Easily register and manage your product inventory with detailed information and categorization.',
    },
    {
      icon: '🔍',
      title: 'Product Search',
      description:
        'Quickly find products with powerful search and filtering capabilities across your entire inventory.',
    },
    {
      icon: '📱',
      title: 'Scan and Sell',
      description:
        'Speed up sales with barcode scanning functionality for instant product lookup and checkout.',
    },
    {
      icon: '💳',
      title: 'Payment & Billing',
      description:
        'Process payments seamlessly with integrated billing and invoice generation features.',
    },
  ];

  const additionalFeatures: Feature[] = [
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description:
        'Gain insights with comprehensive analytics on sales, inventory turnover, and performance metrics.',
    },
    {
      icon: '🔔',
      title: 'Inventory Low Alert',
      description:
        'Never run out of stock with automated alerts when inventory levels fall below thresholds.',
    },
    {
      icon: '📅',
      title: 'Reminder',
      description:
        'Stay on top of expiring products and scheduled returns with smart reminder notifications.',
    },
    {
      icon: '👥',
      title: 'Supplier & Customer Management',
      description: 'Manage relationships with suppliers and customers in one centralized platform.',
    },
    {
      icon: '🛡️',
      title: 'User Roles & Permissions',
      description:
        'Control access levels with customizable user roles and granular permission settings.',
    },
    {
      icon: '↩️',
      title: 'Returns & Refund Management',
      description: 'Handle returns and refunds efficiently with streamlined processing workflows.',
    },
  ];

  return (
    <Box as="section" id="features" className={styles.features}>
      <Box className={styles.container}>
        <Stack gap="sm" className={styles.header}>
          <Text as="h2" variant="heading2" className={styles.title}>
            Powerful Features
          </Text>
          <Text className={styles.subtitle}>
            Everything you need to manage your inventory efficiently and scale your business
            operations.
          </Text>
        </Stack>

        <Grid className={styles.mainFeaturesGrid}>
          {mainFeatures.map((feature, index) => (
            <Box key={index} className={styles.featureCard}>
              <Box className={styles.iconContainer}>
                <Text as="span" className={styles.icon}>
                  {feature.icon}
                </Text>
              </Box>
              <Text as="h3" variant="heading3" className={styles.featureTitle}>
                {feature.title}
              </Text>
              <Text className={styles.featureDescription}>{feature.description}</Text>
            </Box>
          ))}
        </Grid>

        <Grid className={styles.additionalFeaturesGrid}>
          {additionalFeatures.map((feature, index) => (
            <Box key={index} className={styles.featureCard}>
              <Box className={styles.iconContainer}>
                <Text as="span" className={styles.icon}>
                  {feature.icon}
                </Text>
              </Box>
              <Text as="h3" variant="heading3" className={styles.featureTitle}>
                {feature.title}
              </Text>
              <Text className={styles.featureDescription}>{feature.description}</Text>
            </Box>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
