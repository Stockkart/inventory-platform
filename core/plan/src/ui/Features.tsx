import type { Feature } from '@inventory-platform/shell/types';
import { Box, Stack, Text, useMatchMedia } from '@inventory-platform/ui-kit';

const iconStyle = {
  width: 64,
  height: 64,
  background: '#e0f2fe',
  border: '2px solid #3b82f6',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
} as const;

export function Features() {
  const isMobile = useMatchMedia('(max-width: 768px)');

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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: isMobile ? '1.5rem' : '2rem',
  } as const;

  const renderFeature = (feature: Feature, index: number) => (
    <Box
      key={index}
      padding={isMobile ? 'lg' : 'xl'}
      rounded="md"
      border
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(6px)',
        transition: 'all 0.25s ease',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Stack gap="md">
        <Text as="span" style={iconStyle}>
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

        <Box style={gridStyle}>{mainFeatures.map(renderFeature)}</Box>
        <Box style={gridStyle}>{additionalFeatures.map(renderFeature)}</Box>
      </Stack>
    </Box>
  );
}
