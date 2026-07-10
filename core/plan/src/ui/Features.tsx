import type { Feature } from '@inventory-platform/shell/types';
import { Box, Stack, Text } from '@inventory-platform/ui-kit';
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

  const renderFeature = (feature: Feature, index: number) => (
    <Box key={index} className={styles.featureCard}>
      <Stack gap="md">
        <Text as="span" className={styles.icon}>
          {feature.icon}
        </Text>
        <Text as="h3" variant="heading3" weight="semibold">
          {feature.title}
        </Text>
        <Text color="secondary">{feature.description}</Text>
      </Stack>
    </Box>
  );

  return (
    <Box as="section" id="features" padding="xl" bg="canvas" width="full">
      <Stack gap="xl" maxWidth="xl" mx="auto">
        <Stack gap="sm" align="center">
          <Text as="h2" variant="heading2" align="center">
            Powerful Features
          </Text>
          <Text color="secondary" align="center" style={{ maxWidth: 600, lineHeight: 1.6 }}>
            Everything you need to manage your inventory efficiently and scale your business
            operations.
          </Text>
        </Stack>

        <Box className={styles.featureGrid}>{mainFeatures.map(renderFeature)}</Box>
        <Box className={styles.featureGrid}>{additionalFeatures.map(renderFeature)}</Box>
      </Stack>
    </Box>
  );
}
